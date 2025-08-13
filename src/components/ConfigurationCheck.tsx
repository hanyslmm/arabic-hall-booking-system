import { AlertCircle, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ConfigurationCheck() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 to-gray-100 dark:from-orange-900 dark:to-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuration Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing Environment Variables</AlertTitle>
            <AlertDescription>
              The application requires Supabase configuration to function properly.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h3 className="font-semibold">Required Environment Variables:</h3>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              <p>VITE_SUPABASE_URL=your_supabase_url</p>
              <p>VITE_SUPABASE_ANON_KEY=your_supabase_anon_key</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Setup Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create a <code className="bg-muted px-1 py-0.5 rounded">.env</code> file in the project root</li>
              <li>Copy the environment variables from <code className="bg-muted px-1 py-0.5 rounded">.env.example</code></li>
              <li>Replace the placeholder values with your actual Supabase credentials</li>
              <li>Restart the development server</li>
            </ol>
          </div>

          <Alert>
            <AlertTitle>Need Help?</AlertTitle>
            <AlertDescription>
              Visit the Supabase dashboard to get your project URL and anonymous key.
              These can be found in your project settings under API.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}