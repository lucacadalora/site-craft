import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Editor from "@/pages/editor";
import { ApiProvider } from "./context/ApiContext";

// EditorWrapper component to handle routing params
const EditorWrapper = (props: any) => {
  const params = props.params || {};
  const id = params.id;
  return <Editor id={id} />;
};

// Router component with all routes
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/editor">
        {() => <EditorWrapper />}
      </Route>
      <Route path="/editor/:id">
        {(params) => <EditorWrapper params={params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider>
        <div className="min-h-screen flex flex-col">
          <Router />
          <Toaster />
        </div>
      </ApiProvider>
    </QueryClientProvider>
  );
}

export default App;
