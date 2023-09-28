# trpc-selections

Type-safe GraphQL-like fine-grained selections but in pure TypeScript without code generation.

## Motivation

Oftentimes, we need to query the backend for a specific subset of fields for a certain model. While GraphQL is a great solution for this, it adds a significant amount of overhead from complex operation resolution algorithms and the use of custom query and schema language that forces developers to resort to code generation scripts in order to integrate well with TypeScript.

Instead, `trpc-selections` adds on top of tRPC's native type-safety (i.e. no code generation) by introducing the concept of a "selection object" that can be passed to the backend to select a specific subset of fields. It works out-of-the-box with TypeScript without the need for code generation.

## Usage

Backend code:

```typescript
// server/router.ts
import { z } from 'zod';
import { zSelection } from 'trpc-selection'
import { select } from 'typegeese'

import { procedure, router } from '~/utils/trpc.ts'
import { UserModel } from '~/utils/db.ts'

export const appRouter = router({
  getUser: procedure
    .input(
      z.object({
        id: z.string(),
        selection: zSelection()
      })
    )
    .query(async ({ input }) => {
      const user = await select(
        UserModel.findById(input.id),
        selection: input.selection
      );

      return user;
    })
});
```

Frontend code:
```typescript
import { withSelection } from 'trpc-selections';

const user = await withSelection(
  (selection) => appRouter.getUser.query({
    id: '<userId>',
    selection
  }),
  // `withSelection` takes a selection object containing the exact fields
  // you want to select from the `User` model
  {
    username: true,
    fullName: true,
    posts: {
      select: {
        title: true
      }
    }
  }
)

console.log(user); // Outputs: "{ username: '...', email: '...', posts: [{ title: '...' }, ...] }"
```

## Selection hashes

To avoid DoS attacks from users passing arbitrarily complex selection objects to your route, `trpc-selections` provides a helper function called `generateHashes` that statically extracts all the inline selection objects throughout your entire codebase using `ripgrep` and AST parsing.


