# tRPC Selections

GraphQL-like selections in pure TypeScript w/ tRPC.

## Comparison with GraphQL

GraphQL requires additional tooling and complex workflows to integrate nicely with TypeScript:

```typescript
/**
  The following example is from Apollo Client's documentation.
  @see https://www.apollographql.com/docs/react/get-started/
*/
const result = await client.query({
  // Since GraphQL uses a custom query language,
  // TypeScript can't verify that this following GraphQL
  // query is valid and the developer needs to install
  // additional tooling for better DX.
  query: gql`
    query GetLocations {
      locations {
        id
        name
        description
        photo
      }
    }
  `,
});

// Code generation scripts are required for TypeScript
// to correctly infer the type of `result`
console.log(result);
```

In contrast, tRPC Selections leverages tRPC's end-to-end type safety to integrate well with TypeScript out-of-the-box without any code generation scripts:

```typescript
const result = await withSelection(
  (selection) => trpc.locations.get.query({ selection }),
  // TypeScript checks the selection fields based on the `Location` model
  // (which is inferred by the return value of `trpc.locations.get`)
  {
    id: true,
    name: true,
    description: true,
    photo: true
  }
)

// The type of `result` is correctly inferred using the
// fields passed in the above selections object
console.log(result);
```

## Motivation

Oftentimes, we need to query the backend for a specific subset of fields for a certain model. While GraphQL is a great solution for this, it adds a significant amount of overhead from complex operation resolution algorithms and the use of custom query and schema language that forces developers to resort to code generation scripts in order to integrate well with TypeScript.

Instead, `trpc-selections` adds on top of tRPC's native type-safety (i.e. no code generation) by introducing the concept of a "selection object" that can be passed to the backend to select a specific subset of fields. It works out-of-the-box with TypeScript without the need for code generation.

## Usage

### With [Prisma](https://prisma.io)

TODO

### With [typegeese](https://github.com/Tunnel-Labs/typegeese)

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
