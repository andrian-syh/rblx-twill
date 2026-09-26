// Every release, newest first. This is the single source of truth for the news
// section: NewsGrid renders the cards from it, and NewsPagination derives each
// page's previous and next links from its position here.
//
// Adding a release means adding one entry at the top of this list and creating
// the matching .mdx page. Nothing else needs editing; a page that is missing
// from this list fails the build rather than rendering with dead links.
//
// How a card is written, so every card reads the same way:
// - title: sentence case, names the main outcome, no ampersand, no wordplay.
//   The page title is `vX.Y.Z — <title>`.
// - tagline: one sentence, present tense, active voice, most important change
//   first. The page description and lead repeat it.
// - summary: two or three sentences, most important first. A release with a
//   Migration section in the changelog says so in its last sentence.
// - icon: 'rocket' for the first release and each major release, 'star' for a
//   minor release, 'file' for a patch release.

export interface Release {
	version: string;
	title: string;
	date: string;
	tagline: string;
	summary: string;
	slug: string;
	icon: 'star' | 'file' | 'compass' | 'rocket';
}

export const releases: Release[] = [
	{
		version: 'v2.0.0',
		title: 'One Twill module per side',
		date: 'September 26, 2026',
		tagline: 'Twill installs as two modules named Twill, one per side, and adds traffic counting and the Trade kit.',
		summary:
			'The server half is a module named Twill, which checks that both halves come from the same release. Kits ship inside Twill, starting with Trade, and Net counts its traffic so bandwidth can be measured on a live server. Some code needs changes; see the migration notes.',
		slug: '/news/v2-0-0/',
		icon: 'rocket',
	},
	{
		version: 'v1.10.0',
		title: 'Configs, teleports and leaderboards',
		date: 'September 25, 2026',
		tagline: 'Six new modules cover configs, asynchronous work, pooling, cross-server budgets, teleports and leaderboards, and player data can refuse a bad save.',
		summary:
			'Async, Pool, Config, Shared, Teleport and Board join the framework. A Validate check stops a bad state from being saved, and admin edits go through it too. Saves are merged, shutdown stops retrying sooner, and the suite passes under Server Authority. Some code needs changes; see the migration notes.',
		slug: '/news/v1-10-0/',
		icon: 'star',
	},
	{
		version: 'v1.9.0',
		title: 'Replicated state that always arrives',
		date: 'September 24, 2026',
		tagline: 'Replicated state of any size reaches the client, and player data survives migrations and departures.',
		summary:
			'Each replicated key travels as its own call, so a large inventory no longer leaves a client without state for the whole session. Migrations skip new players and run on a copy, and a redelivered purchase is granted only once it is saved. Some code needs changes; see the migration notes.',
		slug: '/news/v1-9-0/',
		icon: 'star',
	},
	{
		version: 'v1.8.0',
		title: "Player data on Twill's own store",
		date: 'September 2, 2026',
		tagline: "Data runs on Twill's own Store, and the console reads a key's history and holder.",
		summary:
			'The bundled ProfileStore package is removed, while the Data API and the stored format stay the same. The release fixes eight storage faults, including refused writes reported as saved and nothing saved on shutdown. Tokens issued before this release must be reissued.',
		slug: '/news/v1-8-0/',
		icon: 'star',
	},
	{
		version: 'v1.7.4',
		title: 'Unions carry what they accept',
		date: 'August 28, 2026',
		tagline: 'A union refuses members it cannot tell apart, and hostile payloads no longer cost memory.',
		summary:
			'A union that could not tell two members apart used to pick one and lose data, so maps arrived empty and fractions arrived whole. Such a union is now refused where it is declared. Three security fixes close a memory exhaustion, a replication guard bypass and unmetered instance payloads.',
		slug: '/news/v1-7-4/',
		icon: 'file',
	},
	{
		version: 'v1.7.3',
		title: 'Silent failures made visible',
		date: 'August 27, 2026',
		tagline: 'A rollback no longer replays migrations, and three silent failures now fail visibly.',
		summary:
			'Data saved by a newer server keeps its version, so a rollback can no longer run migrations twice. Compress.Decode no longer throws on altered payloads, oversized variable-width numbers are refused at the sender, and a tween on a destroyed target reports gone.',
		slug: '/news/v1-7-3/',
		icon: 'file',
	},
	{
		version: 'v1.7.2',
		title: 'Compression without a bundled package',
		date: 'August 24, 2026',
		tagline: "Compress is Twill's own code end to end, and never reads past the end of a stream.",
		summary:
			'The serializer and entropy coder are now Twill modules, with the API and byte format unchanged, so stored data still reads. Colours round to the nearest step, the dictionary rebuilds when it fills, and a hostile payload returns nil instead of reading past its bytes.',
		slug: '/news/v1-7-2/',
		icon: 'file',
	},
	{
		version: 'v1.7.1',
		title: 'Out-of-range numbers are refused',
		date: 'August 24, 2026',
		tagline: 'A fixed-width number outside its range is refused at the sender instead of wrapped.',
		summary:
			'A client sending 256 for a byte used to arrive as 0, after the wrap had already slipped past every validator. Single values and arrays now refuse out-of-range numbers at the sender. A union with a fixed-width number member carries it instead of throwing.',
		slug: '/news/v1-7-1/',
		icon: 'file',
	},
	{
		version: 'v1.7.0',
		title: 'Tweens on one shared loop',
		date: 'August 24, 2026',
		tagline: "Twill's own Tween module moves every value in the game on one connection.",
		summary:
			'Tween moves properties, attributes, pivots, scales and table fields, sharing one connection that exists only while something plays. Destinations can curve through control points, and colours cross through Oklab. Refusal messages across every module now share one shape.',
		slug: '/news/v1-7-0/',
		icon: 'star',
	},
	{
		version: 'v1.6.1',
		title: 'Faster codec, fewer allocations',
		date: 'August 20, 2026',
		tagline: 'The codec stops repeating work and allocates less on its busiest path.',
		summary:
			'Net.Any builds an error path only when an error is raised, instead of for every key it writes. Fixed-width arrays check bounds once per run, and CFrame packing no longer allocates. The API is unchanged.',
		slug: '/news/v1-6-1/',
		icon: 'file',
	},
	{
		version: 'v1.6.0',
		title: 'Signals that never strand a thread',
		date: 'August 20, 2026',
		tagline: "Twill's own Signal runs every listener and never leaves a waiting thread behind.",
		summary:
			'Destroying a signal wakes every thread parked in Wait. Each listener runs in its own xpcall, changes made mid-fire follow the engine\'s rules, and firing one listener is nearly twice as fast. The immediate-mode methods are removed; see the migration table.',
		slug: '/news/v1-6-0/',
		icon: 'star',
	},
	{
		version: 'v1.5.0',
		title: 'Cleanup that always finishes',
		date: 'August 20, 2026',
		tagline: "Twill's own Bag closes newest first and runs to the end even when a step fails.",
		summary:
			'A cleanup that raised used to strand every entry behind it and stop the bag for good. Bag closes each entry in its own pcall, newest first, in linear time. Scope.Trove is now Scope.Bag; see the migration table.',
		slug: '/news/v1-5-0/',
		icon: 'star',
	},
	{
		version: 'v1.4.0',
		title: "Networking on Twill's own wire format",
		date: 'August 20, 2026',
		tagline: 'Net has a built-in wire format, and a corrupt call costs only itself.',
		summary:
			'Every call carries the length of its own body, so a corrupt or refused call is skipped and the calls behind it still arrive. Remotes are declared with Net.Types, and the bundled Packet library is removed. Only declarations need to change.',
		slug: '/news/v1-4-0/',
		icon: 'star',
	},
	{
		version: 'v1.3.1',
		title: 'Big numbers survive the console',
		date: 'August 19, 2026',
		tagline: 'The console keeps big numbers exact with the new big: prefix.',
		summary:
			'Values typed into playerdata were read as JSON, so numbers past what a double holds were silently rounded. The big: prefix writes them exactly, and the console prints big numbers in a form you can type back.',
		slug: '/news/v1-3-1/',
		icon: 'file',
	},
	{
		version: 'v1.3.0',
		title: 'Seven console commands',
		date: 'August 16, 2026',
		tagline: 'Seven console commands expose state only Twill can see, with a setting to turn them off.',
		summary:
			'New commands report boot order, remotes, replication and log levels, and act on ranks, passes, saves and disputed rolls. TwillCommands controls which ones register. A security fix makes unban check rank, as kick and ban already did.',
		slug: '/news/v1-3-0/',
		icon: 'star',
	},
	{
		version: 'v1.2.0',
		title: 'Subscriptions with an owner',
		date: 'August 14, 2026',
		tagline: "Replication.Subscribe takes an owner, two defects are fixed, and every module's documentation is rewritten.",
		summary:
			'A subscription can close with its owner bag, so one made for a player no longer outlives them. Lifecycle no longer announces the departure of a player it never announced, and Schema no longer raises on an object rule with no fields.',
		slug: '/news/v1-2-0/',
		icon: 'star',
	},
	{
		version: 'v1.1.0',
		title: 'Weighted draws and pathfinding',
		date: 'August 13, 2026',
		tagline: 'Two new modules, Chance and Navigation, and Random rounds that both can draw from.',
		summary:
			'Chance draws weighted entries with luck as an exponent, and accepts a Random round so draws stay auditable. Navigation drives every pathfinding agent from one loop, with a route budget and a give-up rule based on progress.',
		slug: '/news/v1-1-0/',
		icon: 'star',
	},
	{
		version: 'v1.0.0',
		title: 'First release',
		date: 'August 12, 2026',
		tagline: "Twill's first release: a modular Luau framework whose API is stable until the next major version.",
		summary:
			'Core modules cover lifecycle, networking, replication, player data, cleanup and logging, alongside utilities and game systems such as ranks, an admin console, monetization and provably fair randomness. Every module works on its own, with no build step.',
		slug: '/news/v1-0-0/',
		icon: 'rocket',
	},
];
