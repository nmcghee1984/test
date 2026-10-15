# Expo Go on a physical iPhone or Android

This development recipe uses **Tailscale Serve**, private to authenticated devices in your tailnet, and an exact tester-login allowlist enforced on every API route. It requires Tailscale on your computer and phone, an account/tailnet you control, and permission to use it on your network. It does not provision an account or change your network automatically. Use test questions, not sensitive University data. This is not production authentication.

## One-time setup on your computer and phone

1. Install current Tailscale on the computer (macOS, Windows or Linux) and phone; sign both into the same private tailnet. Install its CLI on the computer and confirm `tailscale status` works. On macOS enable the CLI integration or use the full path to the bundled CLI. On Windows run these commands in PowerShell with Node and Tailscale on PATH.
2. Enable MagicDNS and HTTPS certificates in the tailnet admin console, or follow the consent URL offered by Serve. Certificates reveal the machine DNS name in public certificate transparency logs; choose a non-sensitive machine name. Keep the tailnet limited to intended testers and restrict access to the computer’s TCP 443 with tailnet access rules. The API additionally rejects any login absent from its allowlist, even if tailnet rules otherwise allow access.
3. Install an Expo Go version supporting this repository’s Expo SDK (currently 57). If the store version does not support it on your OS, use a compatible Expo development build; this change cannot make an incompatible Expo Go binary run SDK 57.
4. Run `npm ci` in the repository. Copy `.env.example` to `.env` and `.env.server.example` to `.env.server` (PowerShell: `Copy-Item`; macOS/Linux: `cp`). Set `API_TESTER_LOGINS` in `.env.server` to the exact Tailscale login of your phone’s signed-in user (comma-separated if needed). Tagged devices do not carry a user identity and will be denied. Set your real `OPENAI_API_KEY` only in `.env.server`, or remove the placeholder line to test discovery without AI. Both files are ignored by Git. Remove any inherited `API_PORT`/`API_HOST` overrides; this recipe uses port 8787.

## Run each session

Terminal 1:

```sh
npm run api:device
```

This forces authenticated device mode and binding to `127.0.0.1`. Empty tester lists fail at startup. Direct localhost requests without a Serve identity now return 403, including health. Stop any existing `npm run api` process first; port-in-use is an error, not a successful launch.

Terminal 2:

```sh
tailscale serve --https=443 http://127.0.0.1:8787
```

Keep it in the foreground. Review existing `tailscale serve status` first: port 443 must be available and must not overwrite another service. Follow any HTTPS enablement prompt. Copy the printed **Available within your tailnet** HTTPS origin into `.env`, replacing the localhost value:

```dotenv
EXPO_PUBLIC_DISCOVERY_API_URL=https://your-computer.your-tailnet.ts.net
```

Use the actual origin, with no path or credentials. **Do not use Tailscale Funnel or a public tunnel.** Serve strips user-supplied identity headers and adds the authenticated tailnet identity. Funnel does not supply that identity and the API will deny it. Never bind the API to `0.0.0.0`, disable TLS verification, or put an OpenAI key, VPN auth key or tunnel secret in `EXPO_PUBLIC_*`. The app contains only the service URL. The trust boundary assumes other processes on the developer computer are trusted: a local process can forge proxy headers. Do not forward this backend through another proxy.

Terminal 3:

```sh
npm run device:check
npx expo start --lan --clear
```

The diagnostic checks fresh health, discovery status and assistant configuration without making a paid AI request or reading cached app data. It checks the computer’s route only; the computer’s login must also be in the allowlist to pass. Changing `.env` requires restarting Expo and fully reloading Expo Go. Existing environment variables take precedence over files; remove stale shell settings if the URL appears unchanged.

The API path and Expo’s Metro bundle path are separate. For the simplest setup, put both devices on the same trusted Wi-Fi and allow Metro TCP 8081 from that network through your computer firewall. Do not open API port 8787. If Wi-Fi blocks peer devices, `npx expo start --tunnel --clear` is an optional Metro transport; it does **not** tunnel or authenticate the API. It may publish the development bundle, so use only an appropriate test environment and stop it after testing. The API still requires the private VPN. The phone can test the API on mobile data with Tailscale connected, but Metro also needs a reachable transport.

## On the phone

- **iPhone:** connect Tailscale and accept its VPN permission. In Safari open `https://<actual-serve-host>/api/health`; expect JSON containing `"status":"ok"`. Scan Expo’s QR code using Camera, open in Expo Go, and allow Local Network access when using LAN Metro (Settings → Apps → Expo Go → Local Network if previously denied).
- **Android:** connect Tailscale and accept its VPN permission. Open the same health URL in Chrome. In Expo Go scan the terminal QR code. Permit camera access if requested. If another always-on VPN prevents Tailscale connecting, resolve that on the device rather than weakening API security.
- Open Discover Glasgow: verify a fresh source-status request and search. An empty index is legitimate; run `npm run harvest` on the computer if appropriate and reload the tab. Existing cached results alone are not evidence of connectivity.
- Open Ask UofG: it should show whether the server is configured. With a valid server-only key, send a non-sensitive question and verify a response. This is the only step here that may incur provider usage. Existing origin restrictions, request limits and response validation remain enforced.

## Diagnostics and negative checks

| Symptom | Check |
| --- | --- |
| API says localhost on the phone | Replace `.env` URL, stop Metro, restart with `--clear`, reload Expo Go. Localhost is still valid for computer/simulator workflows. |
| Timeout / network error | API and Serve foreground processes running? Computer awake? Tailscale connected on both? Correct MagicDNS hostname? Phone browser health works? Conflicting VPN or network policy? |
| HTTP 403 | Exact phone login in `API_TESTER_LOGINS`? Restart API after edits. Use an untagged phone and Serve, not Funnel. Browser assistant requests also require an allowed exact origin. |
| Health works but Expo will not open | Check Expo SDK compatibility, Metro QR address, same Wi-Fi, Local Network permission and TCP 8081 firewall. |
| Assistant unconfigured / provider error | Remove example key or set a valid key only in `.env.server`, restart API; check provider account separately. Health does not validate a key or provider availability. |
| Discover works offline | Cached research can still show; use browser health and `device:check` for fresh connectivity. |

Before considering the setup verified, disconnect Tailscale on the phone and confirm health cannot be reached (use a fresh browser request), reconnect and confirm success. An authenticated tailnet user absent from the allowlist must get 403. From a computer outside the tailnet the HTTPS endpoint must be unreachable. Do not enable public forwarding to perform these tests. Never include credentials in screenshots/logs.

Stop Metro and Serve with Ctrl+C and stop the API when finished. If you independently chose background Serve, turn off only this listener with `tailscale serve --https=443 off`; avoid resetting unrelated services. To return to computer-only testing, restore `.env` to localhost and run `npm run api` with `API_ACCESS_MODE` unset. Keep `.env.server` private.

## Validation boundary and references

Automated tests cover fail-closed configuration, missing/wrong/valid identity, non-loopback spoofing, all protected routes and retained assistant origin checks. TypeScript and JavaScript exports do not prove native connectivity. Installing/signing into Tailscale, enabling HTTPS, firewall/network changes, Expo Go compatibility, QR loading, real AI responses and Wi-Fi/mobile-data positive/negative tests require your computer and phone. No physical-device test is claimed by CI.

- [Tailscale Serve and identity trust boundary](https://tailscale.com/docs/features/tailscale-serve)
- [Serve CLI and stopping listeners](https://tailscale.com/docs/reference/tailscale-cli/serve)
