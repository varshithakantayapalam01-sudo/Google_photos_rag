"use client";

import React, { useEffect, useState } from "react";
import { PipelineStatus } from "@/components/admin/PipelineStatus";
import { CollectionBatch } from "@/types/database";

export default function AdminPipelinePage() {
  const [batches, setBatches] = useState<CollectionBatch[]>([]);

  useEffect(() => {
    fetch("/api/admin/batches")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setBatches(json.data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <PipelineStatus batches={batches} />
    </div>
  );
}
