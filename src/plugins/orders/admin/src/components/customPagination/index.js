import { Dots, NextLink, PageLink, Pagination, PreviousLink } from '@strapi/design-system';
import pluginId from '../../pluginId';

const CustonPagination = ({ totalPages, active }) => {
    // const totalPages = Math.ceil(total / 10)
    const activePage = parseInt(active)
    const maxPage = Math.min(totalPages, activePage + 1)// Math.max(currentPage + 1, 4))
    const minPage = Math.max(1, active - 1)// Math.min(currentPage - 1, maxPage - 3))

    console.log("active:", active, "minPage:", minPage, "maxPage:", maxPage)
    return (
        <Pagination activePage={activePage} pageCount={totalPages}>
            <PreviousLink to={`/plugins/${pluginId}?page=${activePage-1}`}>Go to previous page</PreviousLink>
            {activePage !== 1 && <PageLink number={1} to={`/plugins/${pluginId}?page=${1}`}>
                Go to page {1}
            </PageLink>}
            {totalPages > 3 && minPage > 2 && <Dots>And {totalPages - 4} other links</Dots>}
            {minPage > 1 &&
                <PageLink number={minPage} to={`/plugins/${pluginId}?page=${minPage}`}>
                    Go to page {minPage}
                </PageLink>
            }
            <PageLink number={activePage} to={`/plugins/${pluginId}?page=${activePage}`}>
                Go to page {activePage}
            </PageLink>
            {maxPage < totalPages && maxPage > activePage &&
                <PageLink number={maxPage} to={`/plugins/${pluginId}?page=${maxPage}`}>
                    Go to page {maxPage}
                </PageLink>
            }
            {totalPages > 3 && maxPage < totalPages - 1 && <Dots>And {totalPages - 4} other links</Dots>}
            {totalPages > activePage && <PageLink number={totalPages} to={`/plugins/${pluginId}?page=${totalPages}`}>
                Go to page {totalPages}
            </PageLink>}
            <NextLink to={`/plugins/${pluginId}?page=${activePage + 1}`} disabled>Go to next page</NextLink>
        </Pagination>
    )
}

export default CustonPagination