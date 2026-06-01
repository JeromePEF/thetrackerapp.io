// Web-only CSS imports used by the Expo starter template's animated splash.
// On native, these resolve to no-ops via Metro; on web, Webpack/Metro handle them.
declare module "*.css";
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
