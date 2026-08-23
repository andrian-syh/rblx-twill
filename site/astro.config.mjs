// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { rehypeBaseLinks } from './plugins/rehype-base-links.mjs';

// The deployed site lives at a project-page sub-path, which the Pages workflow
// supplies as BASE_PATH. Left at '/' otherwise, so `npm run dev` serves from the
// root. Test the sub-path locally with:
//   MSYS_NO_PATHCONV=1 BASE_PATH=/rblx-twill npm run build && npm run preview
const base = process.env.BASE_PATH ?? '/';

// The `link:` values of the hero actions in src/content/docs/index.mdx. Keep in
// step with that file; see the validator note below for why they are listed.
const HERO_ACTIONS = new Set([
	'/getting-started/quick-start/',
	'/news/',
	'/getting-started/introduction/',
]);

export default defineConfig({
	// Where the built site is served from. Only absolute URLs need it, which
	// means the sitemap; nothing on the page depends on it.
	site: 'https://andrian-syh.github.io',
	base,
	// The floating toolbar overlaps the pagination cards at the foot of a page.
	// It never shipped in a build anyway, so this only affects `astro dev`.
	devToolbar: { enabled: false },
	markdown: {
		rehypePlugins: [rehypeBaseLinks(base)],
	},
	integrations: [
		starlight({
			title: 'Twill',
			description:
				'A modular framework for Roblox. Two folders, no build step, no package manager, and every module works on its own.',
			customCss: ['./src/styles/custom.css'],
			// One mark, one file. Starlight only reads a favicon out of public/, so
			// the header logo points at that same file rather than a second copy in
			// src/assets that would silently drift out of step with it.
			logo: { src: './public/favicon.svg', alt: '' },
			components: {
				// Starlight's head, plus font preloads, so text does not reflow
				// once the fonts arrive.
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
				// Carries the top nav, which Starlight has no slot for.
				SiteTitle: './src/components/SiteTitle.astro',
				// Prefixes hero action links with `base`.
				Hero: './src/components/Hero.astro',
				// Renders nothing. The site is dark only, so a theme selector would
				// offer a choice with no effect. See design.md and custom.css.
				ThemeSelect: './src/components/ThemeSelect.astro',
				// Starlight's footer, plus a site footer with link columns and the
				// copyright line.
				Footer: './src/components/Footer.astro',
			},
			// Code blocks are deliberately left as Expressive Code ships them. A
			// code block should read as a code editor, so the design system stops
			// at its edge.
			//
			// emitExternalStylesheet: false is a fix, not a preference. By default
			// Expressive Code writes its CSS to /_astro/ec.<hash>.css and points a
			// <link rel="stylesheet"> at it. In `astro dev`, Vite serves that path
			// as a JavaScript module (Content-Type: text/javascript, wrapped in
			// createHotContext), so the browser cannot parse it as CSS and every
			// code block loses its frame, tab, and copy button. Starlight's own
			// print.css dodges this with Vite's `?no-inline` marker; the Expressive
			// Code link carries no such query. Inlining the styles sidesteps the
			// whole path and behaves identically in dev and in a build.
			expressiveCode: {
				themes: ['github-dark'],
				emitExternalStylesheet: false,
				// Only the frame surface and the tab shape. The code area goes darker
				// than github-dark's own #24292e, the tab bar stays a step lighter so
				// the file name reads as a tab, and the border carries the edge, since
				// at this darkness the panel alone is barely off the #101010 canvas.
				// Syntax colours, padding, and fonts are left to the theme.
				styleOverrides: {
					codeBackground: '#17191d',
					borderColor: '#30343b',
					frames: {
						editorActiveTabBackground: '#17191d',
						editorTabBarBackground: '#1f2228',
						editorTabBorderRadius: '6px',
						terminalBackground: '#17191d',
						terminalTitlebarBackground: '#1f2228',
					},
				},
			},
			// Left at its default (error on relative links) on purpose: the plugin
			// returns before validating a relative link, so a relative link is an
			// unchecked link. rehypeBaseLinks makes root-relative safe under `base`.
			plugins: [
				starlightLinksValidator({
					// The validator joins `base` into its route table, so it only accepts
					// links that already carry the base. rehypeBaseLinks supplies that for
					// links written in Markdown, but hero actions live in frontmatter,
					// which no Markdown plugin ever sees. A root-relative action therefore
					// reads as invalid here under a project-page sub-path, however it is
					// written.
					//
					// src/components/Hero.astro prefixes them at render time instead, and
					// that is verified by building with BASE_PATH set and reading the
					// emitted hrefs. Scoped to the landing page's three action links so
					// nothing else is ever skipped, including the Markdown links on the
					// same page, which arrive here already prefixed.
					exclude: ({ file, link }) =>
						file.endsWith('index.mdx') && HERO_ACTIONS.has(link),
				}),
			],
			pagination: true,
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/andrian-syh/rblx-twill' },
			],
			// Entries are listed by slug rather than autogenerated, so the order is
			// editorial. An entry for a page that does not exist fails the build.
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'An introduction to Twill', slug: 'getting-started/introduction' },
						{ label: 'Installing Twill', slug: 'getting-started/installation' },
						{ label: 'Quick start', slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Core Guides',
					items: [
						{ label: 'Write a service', slug: 'core-guides/services' },
						{ label: 'Write a controller', slug: 'core-guides/controllers' },
						{ label: 'Store and save player data', slug: 'core-guides/player-data' },
						{ label: 'Define and serve remotes', slug: 'core-guides/networking' },
						{ label: 'Replicate state to clients', slug: 'core-guides/replicating-state' },
						{ label: 'Clean up connections and instances', slug: 'core-guides/cleanup-and-lifetimes' },
					],
				},
				{
					label: 'How-To Guides',
					items: [
						{
							label: 'Security',
							collapsed: false,
							items: [
								{ label: 'Gate actions by rank', slug: 'guides/ranks-and-permissions' },
								{ label: 'Add an admin console', slug: 'guides/admin-console' },
								{ label: 'Filter player-written text', slug: 'guides/filtering-text' },
							],
						},
						{
							label: 'Economy',
							collapsed: true,
							items: [
								{ label: 'Sell products and passes', slug: 'guides/monetization' },
								{ label: 'Issue redeemable codes', slug: 'guides/redeemable-codes' },
								{ label: 'Count past the number limit', slug: 'guides/unbounded-currency' },
								{ label: 'Run a draw a player can audit', slug: 'guides/provably-fair-draws' },
							],
						},
						{
							label: 'Presentation',
							collapsed: true,
							items: [
								{ label: 'Build interfaces from data', slug: 'guides/building-interfaces' },
								{ label: 'Show stats in the player list', slug: 'guides/leaderstats' },
							],
						},
						{
							label: 'World',
							collapsed: true,
							items: [
								{ label: 'Bind behaviour to tagged instances', slug: 'guides/tagged-instances' },
								{ label: 'Walk NPCs around the world', slug: 'guides/npc-navigation' },
							],
						},
						{
							label: 'Reliability',
							collapsed: true,
							items: [
								{ label: 'Store Roblox values safely', slug: 'guides/storing-roblox-values' },
								{ label: 'Send large payloads', slug: 'guides/large-payloads' },
								{ label: 'Spread work across frames', slug: 'guides/frame-budget' },
								{ label: 'See what your game is doing', slug: 'guides/logging-and-errors' },
							],
						},
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Module reference', slug: 'reference' },
						{
							label: 'Core',
							collapsed: false,
							items: [
								{ label: 'Lifecycle', slug: 'reference/lifecycle' },
								{ label: 'Net', slug: 'reference/net' },
								{ label: 'Replication', slug: 'reference/replication' },
								{ label: 'Data', slug: 'reference/data' },
								{ label: 'Scope', slug: 'reference/scope' },
								{ label: 'Bag', slug: 'reference/bag' },
								{ label: 'Signal', slug: 'reference/signal' },
								{ label: 'Log', slug: 'reference/log' },
							],
						},
						{
							label: 'Utilities',
							collapsed: true,
							items: [
								{ label: 'Schema', slug: 'reference/schema' },
								{ label: 'Limit', slug: 'reference/limit' },
								{ label: 'Loop', slug: 'reference/loop' },
								{ label: 'Watch', slug: 'reference/watch' },
								{ label: 'Format', slug: 'reference/format' },
								{ label: 'Serialize', slug: 'reference/serialize' },
								{ label: 'Compress', slug: 'reference/compress' },
								{ label: 'Tree', slug: 'reference/tree' },
								{ label: 'Error', slug: 'reference/error' },
								{ label: 'BigNumber', slug: 'reference/bignumber' },
								{ label: 'Chance', slug: 'reference/chance' },
								{ label: 'Tween', slug: 'reference/tween' },
							],
						},
						{
							label: 'Game systems',
							collapsed: true,
							items: [
								{ label: 'Navigation', slug: 'reference/navigation' },
								{ label: 'Authorization', slug: 'reference/authorization' },
								{ label: 'Admin', slug: 'reference/admin' },
								{ label: 'Monetization', slug: 'reference/monetization' },
								{ label: 'Leaderstats', slug: 'reference/leaderstats' },
								{ label: 'Filter', slug: 'reference/filter' },
								{ label: 'Random', slug: 'reference/random' },
								{ label: 'Token', slug: 'reference/token' },
							],
						},
						{
							label: 'Project',
							collapsed: true,
							items: [
								{ label: 'Bundled packages', slug: 'reference/bundled-packages' },
								{ label: 'Platform limits', slug: 'reference/platform-limits' },
								{ label: 'Troubleshooting', slug: 'reference/troubleshooting' },
								{ label: 'Glossary', slug: 'reference/glossary' },
							],
						},
					],
				},
				{
					label: 'Explanation',
					items: [
						{ label: 'Design principles', slug: 'explanation/design-principles' },
						{ label: 'Architecture', slug: 'explanation/architecture' },
						{ label: 'Testing and verification', slug: 'explanation/testing' },
					],
				},
			],
		}),
	],
});
