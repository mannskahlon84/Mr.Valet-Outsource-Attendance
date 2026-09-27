/**
 * The one nav link to highlight for a page: the longest link that is the page itself or one of
 * its parents. "/operations/requests/new" highlights Dispatch, not also Requests.
 */
export function activeNavHref(pathname: string | null, hrefs: string[]): string | undefined {
    if (!pathname) return undefined;
    return hrefs
        .filter(href => pathname === href || pathname.startsWith(href.endsWith('/') ? href : `${href}/`))
        .sort((a, b) => b.length - a.length)[0];
}
