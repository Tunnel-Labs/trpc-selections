# trpc-selections

Type-safe GraphQL-like fine-grained selections but in pure TypeScript without code generation.

## Usage

Backend code:

```typescript
// server/router.ts
import { z } from 'zod';
import { zSelection } from 'trpc-selection'
import { select } from 'typegeese'
import { UserModel } from '~/db.ts'

export const appRouter = router({
  getUser: publicProcedure
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
  // This is an object containing the exact fields you want to select from the `User` model
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



