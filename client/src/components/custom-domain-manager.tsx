import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Globe, CheckCircle, AlertCircle, Copy, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CustomDomain {
  id: number;
  domain: string;
  deploymentSlug: string;
  verified: boolean;
  sslStatus: string;
  verificationToken: string;
  createdAt: string;
}

interface DNSInstructions {
  message: string;
  records: Array<{
    type: string;
    host: string;
    value: string;
    description: string;
  }>;
  note: string;
}

interface CustomDomainManagerProps {
  deploymentSlug: string;
  onDomainConnected?: () => void;
}

export function CustomDomainManager({ deploymentSlug, onDomainConnected }: CustomDomainManagerProps) {
  const [newDomain, setNewDomain] = useState('');
  const [showDnsInstructions, setShowDnsInstructions] = useState<DNSInstructions | null>(null);
  const { toast } = useToast();

  const { data: domainsData, isLoading } = useQuery<{ domains: CustomDomain[] }>({
    queryKey: ['/api/domains'],
    enabled: !!deploymentSlug,
  });

  const domains: CustomDomain[] = domainsData?.domains || [];
  const connectedDomain = domains.find(d => d.deploymentSlug === deploymentSlug);

  const requestDomainMutation = useMutation({
    mutationFn: async (domain: string): Promise<{ success: boolean; customDomain: CustomDomain; dnsInstructions: DNSInstructions }> => {
      const response = await apiRequest('POST', '/api/domains', {
        domain,
        deploymentSlug,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Domain Requested',
        description: 'Please configure DNS records to verify ownership.',
      });
      setShowDnsInstructions(data.dnsInstructions);
      setNewDomain('');
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      onDomainConnected?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to request domain',
        variant: 'destructive',
      });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: number): Promise<{ success: boolean; message: string; errors?: string[] }> => {
      const response = await apiRequest('POST', `/api/domains/${domainId}/verify`, {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Domain Verified!',
          description: 'Your custom domain is now active.',
        });
      } else {
        toast({
          title: 'Verification Incomplete',
          description: data.errors?.join(', ') || 'Please check your DNS settings.',
          variant: 'destructive',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify domain',
        variant: 'destructive',
      });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: number) => {
      await apiRequest('DELETE', `/api/domains/${domainId}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: 'Domain Removed',
        description: 'Custom domain has been disconnected.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setShowDnsInstructions(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove domain',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Value copied to clipboard.',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDomain.trim()) {
      requestDomainMutation.mutate(newDomain.trim().toLowerCase());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Domain
        </CardTitle>
        <CardDescription>
          Connect your own domain to this deployment for professional branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectedDomain ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{connectedDomain.domain}</p>
                  <p className="text-sm text-muted-foreground">
                    Connected to {connectedDomain.deploymentSlug}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connectedDomain.verified ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pending Verification
                  </Badge>
                )}
                {!connectedDomain.verified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyDomainMutation.mutate(connectedDomain.id)}
                    disabled={verifyDomainMutation.isPending}
                    data-testid="button-verify-domain"
                  >
                    {verifyDomainMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-1">Verify</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteDomainMutation.mutate(connectedDomain.id)}
                  disabled={deleteDomainMutation.isPending}
                  data-testid="button-remove-domain"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!connectedDomain.verified && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>DNS Configuration Required</AlertTitle>
                <AlertDescription className="mt-2 space-y-3">
                  <p>Add these DNS records to your domain registrar:</p>
                  
                  <div className="space-y-2 font-mono text-sm">
                    <div className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">CNAME Record:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('sites.jatevo.ai')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p><strong>Host:</strong> @ (or your subdomain)</p>
                      <p><strong>Value:</strong> sites.jatevo.ai</p>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">TXT Record (for verification):</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(connectedDomain.verificationToken)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p><strong>Host:</strong> _jatevo-verify</p>
                      <p className="break-all"><strong>Value:</strong> {connectedDomain.verificationToken}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    DNS changes can take up to 48 hours to propagate. Click "Verify" to check status.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {connectedDomain.verified && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-600">Domain Active</AlertTitle>
                <AlertDescription>
                  <p>Your site is now accessible at:</p>
                  <a
                    href={`https://${connectedDomain.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline mt-1"
                  >
                    https://{connectedDomain.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="example.com or www.example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1"
                data-testid="input-custom-domain"
              />
              <Button
                type="submit"
                disabled={!newDomain.trim() || requestDomainMutation.isPending}
                data-testid="button-connect-domain"
              >
                {requestDomainMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect
              </Button>
            </form>

            {showDnsInstructions && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configure DNS</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-3">{showDnsInstructions.message}</p>
                  <div className="space-y-2 font-mono text-sm">
                    {showDnsInstructions.records.map((record, index) => (
                      <div key={index} className="p-3 bg-muted rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{record.type} Record:</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(record.value)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p><strong>Host:</strong> {record.host}</p>
                        <p className="break-all"><strong>Value:</strong> {record.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{record.description}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{showDnsInstructions.note}</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>You must own the domain you want to connect</li>
                <li>Access to your domain's DNS settings is required</li>
                <li>SSL certificate will be automatically provisioned</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
