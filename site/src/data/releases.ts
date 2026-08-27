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
		version: 'v1.7.4',
		title: 'Told Apart, or Not Sent',
		date: 'August 28, 2026',
		tagline: 'A union that could not tell its members apart now says so, instead of picking one.',
		summary:
			'A union picks its member from the value it is handed, and where two members looked alike it picked one and lost the rest: a map arrived as an empty array, a fraction arrived whole, a colour arrived quantised. Such a union is now refused where it is declared. A count found in a payload is weighed before anything is built for it, a replication guard covers every way of writing its key, and ten datatypes a union could name but never carry finally travel.',
		slug: '/news/v1-7-4/',
		icon: 'file',
	},
	{
		version: 'v1.7.3',
		title: 'Four Quiet Wrongs',
		date: 'August 27, 2026',
		tagline: 'A rollback no longer replays migrations, and three other failures that never said a word.',
		summary:
			'Data at a version past the server reading it kept getting marked back down, so every migration in between ran a second time the next time that player reached a newer server. A compressed payload altered in place could raise from a decoder documented never to throw. A variable-width number too large to carry was written anyway and failed at the receiver. A tween whose target was destroyed stopped without saying why.',
		slug: '/news/v1-7-3/',
		icon: 'file',
	},
	{
		version: 'v1.7.2',
		title: 'Compression, All the Way Down',
		date: 'August 24, 2026',
		tagline: "The compressor is now Twill's own code end to end, and reads no stream past its end.",
		summary:
			'Compress no longer leans on a bundled package: its serializer and entropy coder are first-class Twill modules now, in the framework’s own style, with the public API and the byte format unchanged so stored data still reads. Colours round instead of floor, the dictionary rebuilds once it fills, and a malformed payload can no longer read past what it was handed.',
		slug: '/news/v1-7-2/',
		icon: 'file',
	},
	{
		version: 'v1.7.1',
		title: 'The Wire Refuses What It Cannot Carry',
		date: 'August 24, 2026',
		tagline: 'A fixed-width number outside its range is now refused rather than wrapped into another one.',
		summary:
			'A fixed-width integer given a value past what it holds was written wrapped, so a client sending 256 for a byte arrived as 0 and slipped past a validator before it ran. Both the single value and the array path now refuse it. A Union naming a fixed-width number among its members carries one again rather than throwing.',
		slug: '/news/v1-7-1/',
		icon: 'file',
	},
	{
		version: 'v1.7.0',
		title: 'Everything Moves on One Loop',
		date: 'August 24, 2026',
		tagline: "Twill's own tweening, and every value in the game moving on a single connection.",
		summary:
			'Tween moves properties, attributes, a pivot, a scale, or a plain table field, and every tween in the game shares one connection that exists only while something plays. Destinations can curve through control points, colours cross through Oklab, and a tween that outlives its instance ends itself.',
		slug: '/news/v1-7-0/',
		icon: 'star',
	},
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
