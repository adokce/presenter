import { appRouter } from "@mukinho/api/routers/index";
import { createContext } from "@mukinho/api/context";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/healthcheck")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const ctx = await createContext({ req: request });
          const caller = appRouter.createCaller(ctx);

          await caller.healthCheck();

          return new Response("OK", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        } catch (error) {
          return new Response("UNHEALTHY", {
            status: 503,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        }
      },
    },
  },
  component: () => null,
});
