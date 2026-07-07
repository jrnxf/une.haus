# views/ extraction requires a second caller

A route's detail body moves to `src/views/` only when it gains a second caller (page + modal, page + embed) or when the extraction deepens a module — never for cosmetic symmetry with sibling routes. Single-caller bodies (the game-set, vault-video, and riu-submission views) stay inline in their route files even though `PostView`/`UserView` live in `views/`; relocating them collapses no duplication and just creates a second place to look for route-only code, hurting locality.
