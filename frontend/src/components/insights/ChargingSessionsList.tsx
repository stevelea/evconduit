'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useChargingSessions } from "@/hooks/useChargingSessions";
import ChargingSessionRow from "./ChargingSessionRow";
import { downloadChargingSessionsCsv } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";

interface ChargingSessionsListProps {
  vehicleId?: string;
}

export default function ChargingSessionsList({ vehicleId }: ChargingSessionsListProps) {
  const { sessions, total, loading, error, page, setPage } = useChargingSessions({
    limit: 10,
    vehicleId,
  });
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.ceil(total / 10);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadChargingSessionsCsv(vehicleId);
      toast.success("CSV export downloaded");
    } catch {
      toast.error("Failed to export sessions");
    } finally {
      setExporting(false);
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Charging Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sessions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Charging Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Error loading sessions: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Charging Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No charging sessions recorded yet. Charging data will appear here automatically as your vehicle charges.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Charging Sessions
            <Badge variant="secondary" className="text-xs font-normal">Beta</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {total} session{total !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || total === 0}
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Session List */}
        {sessions.map((session) => (
          <ChargingSessionRow key={session.session_id} session={session} />
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!hasPrev || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!hasNext || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
