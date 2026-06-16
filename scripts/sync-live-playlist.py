#!/usr/bin/env python3
"""
Sync the Tracker App live-stream playlist.

Runs as a cron job (every 5-10 minutes):
  1. Finds the current active live broadcast on the channel.
  2. Clears every existing item from the playlist.
  3. Inserts only the active live stream so the embedded player always
     shows the current broadcast.

Usage:
  python3 scripts/sync-live-playlist.py

Dependencies:
  pip install google-api-python-client google-auth-oauthlib

First-run setup:
  - Put client_secret.json in this directory.
  - On first run a browser window opens for OAuth; a token is saved to
    token.pickle for headless cron use thereafter.
"""

import os
import pickle
import sys
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_SECRETS = os.path.join(SCRIPT_DIR, "client_secret.json")
TOKEN_PICKLE = os.path.join(SCRIPT_DIR, "youtube_token.pickle")

# YouTube playlist that powers the /stream embed
# (https://www.youtube.com/embed/videoseries?list=PLXWqvyuPkkG8)
PLAYLIST_ID = "PLXWqvyuPkkG8"

SCOPES = ["https://www.googleapis.com/auth/youtube"]


def get_authenticated_service():
    creds = None

    if os.path.exists(TOKEN_PICKLE):
        with open(TOKEN_PICKLE, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            import google.auth.transport.requests
            creds.refresh(google.auth.transport.requests.Request())
        else:
            if not os.path.exists(CLIENT_SECRETS):
                print(f"ERROR: {CLIENT_SECRETS} not found.", file=sys.stderr)
                print("Download OAuth 2.0 credentials from Google Cloud Console", file=sys.stderr)
                sys.exit(1)

            flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PICKLE, "wb") as f:
            pickle.dump(creds, f)

    return googleapiclient.discovery.build("youtube", "v3", credentials=creds)


def get_active_live_video_id(youtube):
    request = youtube.liveBroadcasts().list(
        part="id,snippet",
        broadcastStatus="active",
    )
    try:
        response = request.execute()
    except googleapiclient.errors.HttpError as exc:
        print(f"API error fetching broadcasts: {exc}", file=sys.stderr)
        return None

    items = response.get("items", [])
    if not items:
        print("No active live broadcast found.")
        return None

    video_id = items[0]["id"]
    title = items[0]["snippet"]["title"]
    print(f"Active broadcast: {video_id} ({title})")
    return video_id


def get_playlist_items(youtube):
    request = youtube.playlistItems().list(
        part="id,contentDetails,snippet",
        playlistId=PLAYLIST_ID,
        maxResults=50,
    )
    items = []
    while request is not None:
        response = request.execute()
        items.extend(response.get("items", []))
        request = youtube.playlistItems().list_next(request, response)
    return items


def clear_playlist(youtube, items):
    if not items:
        return
    for item in items:
        try:
            youtube.playlistItems().delete(id=item["id"]).execute()
            print(f"  Removed: {item['contentDetails']['videoId']}")
        except googleapiclient.errors.HttpError as exc:
            print(f"  Failed to remove {item['contentDetails']['videoId']}: {exc}", file=sys.stderr)


def insert_video(youtube, video_id):
    youtube.playlistItems().insert(
        part="snippet",
        body={
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 0,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id,
                },
            }
        },
    ).execute()
    print(f"  Inserted: {video_id}")


def main():
    youtube = get_authenticated_service()

    live_id = get_active_live_video_id(youtube)
    if not live_id:
        print("Stream offline — playlist unchanged.")
        return

    items = get_playlist_items(youtube)

    if items and items[0]["contentDetails"]["videoId"] == live_id:
        print("Playlist already up-to-date.")
        return

    print("Updating playlist...")
    clear_playlist(youtube, items)
    insert_video(youtube, live_id)
    print("Done.")


if __name__ == "__main__":
    main()
