# Contributing

Thanks for helping improve Voxiva CLI. Bug fixes, clearer docs, accessibility improvements, and focused feature proposals are welcome.

## Set up

Requirements: Node.js 20 or newer and npm.

```bash
git clone https://github.com/voxiva-ai/cli.git
cd cli
npm install
npm run build
```

Run the CLI from the checked-out source:

```bash
npm run dev
```

## Make a change

1. Open an issue first for a large feature or behavior change. Small fixes can go straight to a pull request.
2. Keep changes focused and follow the existing TypeScript and terminal UI patterns.
3. Never commit API keys, `.env` files, chat logs, or data from `~/.voxiva`.
4. Update the README when commands or user-visible behavior change.

## Check your work

```bash
npm run build
npm test
```

For terminal UI changes, also run `npm run dev` in a real terminal and check a narrow window and a wide window.

## Open a pull request

- Explain the user problem and the change in a few sentences.
- List the checks you ran and their results.
- Add a screenshot or short terminal recording for visible UI changes.
- Link the related issue when there is one.

Keep pull requests small enough to review. Maintainers may ask to split unrelated changes.
