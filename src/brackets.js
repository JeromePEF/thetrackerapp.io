// Brackets Page - Tournament Bracket Visualization

const API_BASE = "https://api.thetrackerapp.io";

// Sample bracket data (replace with API fetch)
const SAMPLE_BRACKETS = {
  groups: {
    title: "Group Fitness Championship",
    participants: 16,
    round: "Quarter Finals",
    prize: "$500",
    matches: [
      // Round 1 (8 matches)
      { id: 1, round: 1, team1: "Austin Runners", team2: "NYC Fitness", score1: 1250, score2: 1180, winner: 1 },
      { id: 2, round: 1, team1: "LA Lifters", team2: "Chicago Strong", score1: 980, score2: 1120, winner: 2 },
      { id: 3, round: 1, team1: "Seattle Squad", team2: "Miami Heat", score1: 1340, score2: 1290, winner: 1 },
      { id: 4, round: 1, team1: "Denver Altitude", team2: "Boston Power", score1: 1100, score2: 1150, winner: 2 },
      { id: 5, round: 1, team1: "Phoenix Rise", team2: "Portland Trail", score1: 1420, score2: 1380, winner: 1 },
      { id: 6, round: 1, team1: "Dallas Grit", team2: "Atlanta Hustle", score1: 1050, score2: 1200, winner: 2 },
      { id: 7, round: 1, team1: "SF Bay Area", team2: "Detroit Motor", score1: 1310, score2: 1280, winner: 1 },
      { id: 8, round: 1, team1: "Houston Surge", team2: "Philly Fighters", score1: 1190, score2: 1220, winner: 2 },
      // Round 2 (4 matches)
      { id: 9, round: 2, team1: "Austin Runners", team2: "Chicago Strong", score1: 1380, score2: 1290, winner: 1 },
      { id: 10, round: 2, team1: "Seattle Squad", team2: "Boston Power", score1: 1450, score2: null, winner: null },
      { id: 11, round: 2, team1: "Phoenix Rise", team2: "Atlanta Hustle", score1: null, score2: null, winner: null },
      { id: 12, round: 2, team1: "SF Bay Area", team2: "Philly Fighters", score1: null, score2: null, winner: null },
      // Semi Finals (2 matches)
      { id: 13, round: 3, team1: "Austin Runners", team2: "TBD", score1: null, score2: null, winner: null },
      { id: 14, round: 3, team1: "TBD", team2: "TBD", score1: null, score2: null, winner: null },
      // Finals
      { id: 15, round: 4, team1: "TBD", team2: "TBD", score1: null, score2: null, winner: null },
    ],
  },
  trainers: {
    title: "Personal Trainer Showdown",
    participants: 16,
    round: "Semi Finals",
    prize: "$1,000",
    matches: [
      // Round 1
      { id: 1, round: 1, team1: "Team Mike", team2: "Team Sarah", score1: 2100, score2: 1950, winner: 1 },
      { id: 2, round: 1, team1: "Team Alex", team2: "Team Jordan", score1: 1800, score2: 2200, winner: 2 },
      { id: 3, round: 1, team1: "Team Chris", team2: "Team Taylor", score1: 2050, score2: 1920, winner: 1 },
      { id: 4, round: 1, team1: "Team Morgan", team2: "Team Casey", score1: 1750, score2: 1890, winner: 2 },
      { id: 5, round: 1, team1: "Team Drew", team2: "Team Jamie", score1: 2300, score2: 2150, winner: 1 },
      { id: 6, round: 1, team1: "Team Riley", team2: "Team Quinn", score1: 1980, score2: 2100, winner: 2 },
      { id: 7, round: 1, team1: "Team Avery", team2: "Team Blake", score1: 2250, score2: 2180, winner: 1 },
      { id: 8, round: 1, team1: "Team Logan", team2: "Team Reese", score1: 1850, score2: 2020, winner: 2 },
      // Round 2
      { id: 9, round: 2, team1: "Team Mike", team2: "Team Jordan", score1: 2400, score2: 2350, winner: 1 },
      { id: 10, round: 2, team1: "Team Chris", team2: "Team Casey", score1: 2180, score2: 2050, winner: 1 },
      { id: 11, round: 2, team1: "Team Drew", team2: "Team Quinn", score1: 2500, score2: 2420, winner: 1 },
      { id: 12, round: 2, team1: "Team Avery", team2: "Team Reese", score1: 2380, score2: null, winner: null },
      // Semi Finals
      { id: 13, round: 3, team1: "Team Mike", team2: "Team Chris", score1: null, score2: null, winner: null },
      { id: 14, round: 3, team1: "Team Drew", team2: "TBD", score1: null, score2: null, winner: null },
      // Finals
      { id: 15, round: 4, team1: "TBD", team2: "TBD", score1: null, score2: null, winner: null },
    ],
  },
};

let currentType = "groups";
let currentData = SAMPLE_BRACKETS.groups;
let canvas, ctx;
let scale = 1;
let offsetX = 0, offsetY = 0;
let isDragging = false;
let dragStartX, dragStartY;

function init() {
  canvas = document.getElementById("bracketCanvas");
  if (!canvas) return;
  
  ctx = canvas.getContext("2d");
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  // Toggle buttons
  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type;
      currentData = SAMPLE_BRACKETS[currentType];
      updateInfo();
      drawBracket();
    });
  });
  
  // Zoom controls
  document.getElementById("zoomInBtn")?.addEventListener("click", () => {
    scale = Math.min(2, scale + 0.2);
    drawBracket();
  });
  
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
    scale = Math.max(0.5, scale - 0.2);
    drawBracket();
  });
  
  document.getElementById("resetViewBtn")?.addEventListener("click", () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    drawBracket();
  });
  
  // Pan controls
  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", drag);
  canvas.addEventListener("mouseup", endDrag);
  canvas.addEventListener("mouseleave", endDrag);
  
  // Touch support
  canvas.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    startDrag({ clientX: touch.clientX, clientY: touch.clientY });
  });
  canvas.addEventListener("touchmove", e => {
    const touch = e.touches[0];
    drag({ clientX: touch.clientX, clientY: touch.clientY });
    e.preventDefault();
  });
  canvas.addEventListener("touchend", endDrag);
  
  // Match details close
  document.querySelector(".close-details")?.addEventListener("click", () => {
    document.getElementById("matchDetails").hidden = true;
  });
  
  // Click on canvas to show match details
  canvas.addEventListener("click", handleCanvasClick);
  
  updateInfo();
  drawBracket();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  drawBracket();
}

function startDrag(e) {
  isDragging = true;
  dragStartX = e.clientX - offsetX;
  dragStartY = e.clientY - offsetY;
  canvas.style.cursor = "grabbing";
}

function drag(e) {
  if (!isDragging) return;
  offsetX = e.clientX - dragStartX;
  offsetY = e.clientY - dragStartY;
  drawBracket();
}

function endDrag() {
  isDragging = false;
  canvas.style.cursor = "grab";
}

function updateInfo() {
  document.getElementById("participantCount").textContent = currentData.participants;
  document.getElementById("currentRound").textContent = currentData.round;
  document.getElementById("prizePool").textContent = currentData.prize;
}

function drawBracket() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  
  // Clear
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, width, height);
  
  // Draw grid
  ctx.strokeStyle = "rgba(56, 255, 211, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.save();
  ctx.translate(offsetX + width / 2, offsetY + height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -height / 2);
  
  const matches = currentData.matches;
  const rounds = Math.max(...matches.map(m => m.round));
  
  // Calculate dimensions
  const matchWidth = 160;
  const matchHeight = 50;
  const roundGap = 100;
  const matchGap = 20;
  
  // Group matches by round
  const roundMatches = {};
  for (let r = 1; r <= rounds; r++) {
    roundMatches[r] = matches.filter(m => m.round === r);
  }
  
  // Calculate total width and height
  const totalWidth = rounds * (matchWidth + roundGap);
  const maxMatches = Math.max(...Object.values(roundMatches).map(arr => arr.length));
  const totalHeight = maxMatches * (matchHeight + matchGap);
  
  const startX = (width - totalWidth) / 2 + 50;
  const centerY = height / 2;
  
  // Draw connections and matches for left side (rounds 1-2)
  const leftRounds = Math.ceil(rounds / 2);
  
  for (let r = 1; r <= rounds; r++) {
    const rm = roundMatches[r];
    const isLeftSide = r <= leftRounds;
    const isFinal = r === rounds;
    
    let x;
    if (isFinal) {
      x = width / 2 - matchWidth / 2;
    } else if (isLeftSide) {
      x = startX + (r - 1) * (matchWidth + roundGap);
    } else {
      x = width - startX - matchWidth - (rounds - r) * (matchWidth + roundGap);
    }
    
    const spacing = totalHeight / rm.length;
    
    rm.forEach((match, i) => {
      const y = centerY - (totalHeight / 2) + spacing * i + spacing / 2 - matchHeight / 2;
      
      // Draw match box
      drawMatch(x, y, matchWidth, matchHeight, match);
      
      // Draw connectors to next round
      if (r < rounds) {
        const nextRound = roundMatches[r + 1];
        const nextIndex = Math.floor(i / 2);
        if (nextRound && nextRound[nextIndex]) {
          const nextSpacing = totalHeight / nextRound.length;
          let nextX;
          const isNextFinal = (r + 1) === rounds;
          const isNextLeftSide = (r + 1) <= leftRounds;
          
          if (isNextFinal) {
            nextX = width / 2 - matchWidth / 2;
          } else if (isNextLeftSide) {
            nextX = startX + r * (matchWidth + roundGap);
          } else {
            nextX = width - startX - matchWidth - (rounds - r - 1) * (matchWidth + roundGap);
          }
          
          const nextY = centerY - (totalHeight / 2) + nextSpacing * nextIndex + nextSpacing / 2;
          
          // Draw connector line
          ctx.strokeStyle = match.winner ? "rgba(56, 255, 211, 0.5)" : "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          if (isLeftSide) {
            ctx.moveTo(x + matchWidth, y + matchHeight / 2);
            ctx.lineTo(x + matchWidth + roundGap / 2, y + matchHeight / 2);
            ctx.lineTo(x + matchWidth + roundGap / 2, nextY);
            ctx.lineTo(nextX, nextY);
          } else {
            ctx.moveTo(x, y + matchHeight / 2);
            ctx.lineTo(x - roundGap / 2, y + matchHeight / 2);
            ctx.lineTo(x - roundGap / 2, nextY);
            ctx.lineTo(nextX + matchWidth, nextY);
          }
          ctx.stroke();
        }
      }
    });
  }
  
  ctx.restore();
}

function drawMatch(x, y, w, h, match) {
  const isComplete = match.winner !== null;
  const isLive = match.score1 !== null && match.score2 !== null && match.winner === null;
  
  // Background
  ctx.fillStyle = isLive ? "rgba(56, 255, 211, 0.1)" : "rgba(255, 255, 255, 0.03)";
  ctx.strokeStyle = isLive ? "rgba(56, 255, 211, 0.5)" : "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  
  // Rounded rect
  const radius = 6;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Divider
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  
  // Team 1
  const team1Color = match.winner === 1 ? "#4ade80" : match.winner === 2 ? "#f87171" : "#e8f0f8";
  ctx.fillStyle = team1Color;
  ctx.font = "bold 10px 'Space Grotesk', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(truncate(match.team1, 14), x + 8, y + h / 4);
  
  if (match.score1 !== null) {
    ctx.fillStyle = "#38ffd3";
    ctx.font = "bold 10px 'Orbitron', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(match.score1.toLocaleString(), x + w - 8, y + h / 4);
    ctx.textAlign = "left";
  }
  
  // Team 2
  const team2Color = match.winner === 2 ? "#4ade80" : match.winner === 1 ? "#f87171" : "#e8f0f8";
  ctx.fillStyle = team2Color;
  ctx.font = "bold 10px 'Space Grotesk', sans-serif";
  ctx.fillText(truncate(match.team2, 14), x + 8, y + h * 3 / 4);
  
  if (match.score2 !== null) {
    ctx.fillStyle = "#38ffd3";
    ctx.font = "bold 10px 'Orbitron', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(match.score2.toLocaleString(), x + w - 8, y + h * 3 / 4);
    ctx.textAlign = "left";
  }
  
  // Live indicator
  if (isLive) {
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath();
    ctx.arc(x + w - 12, y + 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function truncate(str, len) {
  if (!str) return "TBD";
  return str.length > len ? str.slice(0, len - 2) + "..." : str;
}

function handleCanvasClick(e) {
  // Could implement match selection here
  // For now, just log click position
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  console.log("Click at:", x, y);
}

// Initialize
init();
