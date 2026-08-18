/**
 * Prefixes root-relative Markdown links with Astro's `base`.
 *
 * Astro rewrites its own component and sidebar links for `base`, but leaves
 * hrefs written inside Markdown alone — so `/reference/net/` 404s under a
 * project-page sub-path. Writing relative links instead dodges that, but
 * starlight-links-validator returns before validating a relative link, so those
 * are never checked at all. Root-relative plus this plugin is the only shape
 * that is both correct under `base` and caught when it breaks.
 */
export function rehypeBaseLinks(base) {
	const prefix = base.replace(/\/+$/, '');
	if (!prefix) return () => () => {};

	function walk(node) {
		if (node.tagName === 'a') {
			const href = node.properties?.href;
			if (
				typeof href === 'string' &&
				href.startsWith('/') &&
				!href.startsWith('//') &&
				!href.startsWith(`${prefix}/`)
			) {
				node.properties.href = prefix + href;
			}
		} else if (
			(node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') &&
			node.name === 'a'
		) {
			const hrefAttr = node.attributes?.find((attr) => attr.name === 'href');
			if (
				hrefAttr &&
				typeof hrefAttr.value === 'string' &&
				hrefAttr.value.startsWith('/') &&
				!hrefAttr.value.startsWith('//') &&
				!hrefAttr.value.startsWith(`${prefix}/`)
			) {
				hrefAttr.value = prefix + hrefAttr.value;
			}
		}
		node.children?.forEach(walk);
	}

	return () => walk;
}
