import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  });

  return router;
};
