'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const vendors = [
  {
    name: 'Enode',
    status: 'Active',
    description: 'EV integration platform',
    supported: ['Xpeng'],
  },
];

export default function VendorsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendors</h1>
        <p className="text-muted-foreground">
          Manage vehicle integration vendors and supported manufacturers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {vendors.map((vendor) => (
          <Card key={vendor.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{vendor.name}</CardTitle>
                <Badge variant={vendor.status === 'Active' ? 'default' : 'secondary'}>
                  {vendor.status}
                </Badge>
              </div>
              <CardDescription>{vendor.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Supported Manufacturers:</p>
                <div className="flex flex-wrap gap-2">
                  {vendor.supported.map((brand) => (
                    <Badge key={brand} variant="outline">
                      {brand}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
