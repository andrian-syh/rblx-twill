// Every release, newest first. This is the single source of truth for the news
// section: NewsGrid renders the cards from it, and NewsPagination derives each
// page's previous and next links from its position here.
//
// Adding a release means adding one entry at the top of this list and creating
// the matching .mdx page. Nothing else needs editing; a page that is missing
// from this list fails the build rather than rendering with dead links.

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
		version: 'v1.6.1',
		title: 'The Codec Stops Repeating Itself',
		date: 'August 20, 2026',
		tagline: 'Work the codec was doing twice, and allocations on the path that carries the most.',
		summary:
			'Net.Any built a path string for every key of every table it wrote, to name a value in an error that almost never came. Paths are now built where the error is raised. A fixed-width array stops re-checking bounds the first check already covered, and CFrame packing no longer allocates a table per value.',
		slug: '/news/v1-6-1/',
		icon: 'file',
	},
	{
		version: 'v1.6.0',
		title: 'Nothing Waits Forever',
		date: 'August 20, 2026',
		tagline: "Twill's own signal, where every listener runs and no waiting thread is ever stranded.",
		summary:
			"A thread parked in Wait used to stay suspended for the rest of the session when its signal was destroyed. Signal wakes it. Every listener runs inside its own xpcall, connecting and disconnecting mid-fire follow the engine's rules, and the common firing got twice as fast.",
		slug: '/news/v1-6-0/',
		icon: 'star',
	},
	{
		version: 'v1.5.0',
		title: 'Cleanup That Finishes',
		date: 'August 20, 2026',
		tagline: "Twill's own cleanup container, closing newest first and running to the end.",
		summary:
			'A cleanup that raised used to strand every entry behind it and silently kill the bag for the rest of the session. Bag closes each one in its own pcall, newest first, in linear time, and lets a cleanup add to the bag it is closing.',
		slug: '/news/v1-5-0/',
		icon: 'star',
	},
	{
		version: 'v1.4.0',
		title: "Networking Is Twill's Own",
		date: 'August 20, 2026',
		tagline: 'A built-in wire format, and a corrupt call that costs only itself.',
		summary:
			'Net carries its own wire format. Every call declares the length of its own body, so a corrupt or refused one is stepped over rather than read, and the calls behind it still arrive. Types are declared with Net.Types, and the bundled Packet library is gone.',
		slug: '/news/v1-4-0/',
		icon: 'rocket',
	},
	{
		version: 'v1.3.1',
		title: 'Big Numbers Survive the Console',
		date: 'August 19, 2026',
		tagline: 'A currency the console quietly rounded, and the mark that stops it.',
		summary:
			'Values typed into playerdata were read through JSON, so big numbers came back smaller than they went in. The new big: mark keeps them whole, and what the console prints can now be typed straight back.',
		slug: '/news/v1-3-1/',
		icon: 'star',
	},
	{
		version: 'v1.3.0',
		title: 'Console Commands & Internal State',
		date: 'August 16, 2026',
		tagline: 'Seven console commands, and the switch to turn them off.',
		summary:
			'Diagnostic commands for state only Twill can see: boot order, unserved remotes, log levels on running servers, replicated state freezes, and rank guardrails.',
		slug: '/news/v1-3-0/',
		icon: 'star',
	},
	{
		version: 'v1.2.0',
		title: 'Subscription Troves & Schema Hardening',
		date: 'August 14, 2026',
		tagline: 'One added argument, two defects, and a documentation pass over every module.',
		summary:
			'Trove bag support for Replication subscriptions to prevent memory leaks on player departure, schema validation fixes, and comprehensive documentation refinement.',
		slug: '/news/v1-2-0/',
		icon: 'file',
	},
	{
		version: 'v1.1.0',
		title: 'Weighted Draws & Scaled Navigation',
		date: 'August 13, 2026',
		tagline: 'Two built-in utilities, and the module they both lean on gains one method.',
		summary:
			'Chance weighted probability with luck factors and auditable Random commitments. Centralized Navigation agent loop with crowd route budgets.',
		slug: '/news/v1-1-0/',
		icon: 'compass',
	},
	{
		version: 'v1.0.0',
		title: 'Initial Release & Stable Core',
		date: 'August 12, 2026',
		tagline: 'First release of the modular pure-Luau game framework.',
		summary:
			'Initial public release featuring pure Luau modules, cryptographic random rounds, HMAC-SHA256 tokens, automatic data replication, and strict schema validation.',
		slug: '/news/v1-0-0/',
		icon: 'rocket',
	},
];
