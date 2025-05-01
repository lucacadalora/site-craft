import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function TestDeployment() {
  const { toast } = useToast();
  const [slug, setSlug] = useState('test-page');
  
  // Function to create a test page and publish it
  const createAndPublishTestPage = async () => {
    if (!slug) {
      toast({
        title: 'Error',
        description: 'Please enter a slug',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // First, create a test project
      const createResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Page: ${slug}`,
          prompt: 'A simple test page',
          templateId: 'default',
          category: 'test',
          settings: {},
        }),
      });
      
      if (!createResponse.ok) {
        throw new Error('Failed to create test project');
      }
      
      const project = await createResponse.json();
      console.log('Created test project:', project);
      
      // Add HTML content to the project
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Deployment Page: ${slug}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gradient-to-r from-purple-500 to-blue-500 min-h-screen flex items-center justify-center">
          <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-3xl font-bold text-center mb-6">Test Deployment Page</h1>
            <p class="text-gray-700 mb-4">
              This is a test page for the deployment system. It was created automatically to verify that
              the publishing functionality works correctly.
            </p>
            <p class="text-gray-700 mb-4">
              <strong>Slug:</strong> ${slug}
            </p>
            <p class="text-gray-700 mb-4">
              <strong>Created at:</strong> ${new Date().toLocaleString()}
            </p>
            <div class="bg-gray-100 p-4 rounded mt-6">
              <p class="text-sm text-gray-600">
                If you're seeing this page, it means that the deployment system is working properly!
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Update the project with HTML content
      const updateResponse = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          css: '',
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update project with HTML content');
      }
      
      const updatedProject = await updateResponse.json();
      console.log('Updated project with HTML:', updatedProject);
      
      // Now publish the project
      const publishResponse = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
        }),
      });
      
      if (!publishResponse.ok) {
        throw new Error('Failed to publish project');
      }
      
      const publishedProject = await publishResponse.json();
      console.log('Published project:', publishedProject);
      
      // Show success message with the published URL
      const publishedUrl = `${window.location.origin}/sites/${slug}`;
      
      toast({
        title: 'Success!',
        description: (
          <div>
            <p>Test page published successfully!</p>
            <a 
              href={publishedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              View published page
            </a>
          </div>
        ),
      });
      
    } catch (error) {
      console.error('Error creating and publishing test page:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Test Deployment</CardTitle>
          <CardDescription>
            Create a test page to verify the deployment functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="test-page"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This will be the URL path of your published page
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={createAndPublishTestPage}>
            Create & Publish Test Page
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}