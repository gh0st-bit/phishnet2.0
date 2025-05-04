import AppLayout from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Ghost, 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  ExternalLink 
} from "lucide-react";

export default function LandingPagesPage() {
  const { data: landingPages } = useQuery({
    queryKey: ['/api/landing-pages'],
  });

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Landing Pages</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Landing Page
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-background border">
          <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=inactive]:text-foreground">All Pages</TabsTrigger>
          <TabsTrigger value="login" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=inactive]:text-foreground">Login Pages</TabsTrigger>
          <TabsTrigger value="form" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=inactive]:text-foreground">Form Pages</TabsTrigger>
          <TabsTrigger value="educational" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=inactive]:text-foreground">Educational</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {landingPages && landingPages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {landingPages.map((page) => (
                <Card key={page.id} className="overflow-hidden">
                  <div className="aspect-video relative bg-secondary">
                    {page.thumbnail ? (
                      <img 
                        src={page.thumbnail} 
                        alt={page.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ghost className="h-12 w-12 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1">{page.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {page.description || "No description provided"}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(page.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ghost className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No landing pages found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Create your first landing page to capture credentials or deliver security awareness training.
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Create Landing Page
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="login">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Filter showing login-type landing pages
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="form">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Filter showing form-type landing pages
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="educational">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Filter showing educational landing pages
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
