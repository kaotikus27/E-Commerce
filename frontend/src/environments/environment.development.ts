export const environment = {
  production: false,
  // Derived from the browser's own hostname (not hardcoded) so this keeps working whether the
  // dev server is opened via localhost or via the PC's LAN IP from another device (e.g. a phone).
  apiUrl: `http://${window.location.hostname}:8080/api/v1`
};
