"use client";

import React, { useEffect, useState } from "react";
import { BatchManager } from "@/components/admin/BatchManager";
import { CollectionBatch } from "@/types/database";

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<CollectionBatch[]>([]);

  const fetchBatches = () => {
    fetch("/api/admin/batches")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setBatches(json.data);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return (
    <div className="space-y-6">
      <BatchManager batches={batches} onRefresh={fetchBatches} />
    </div>
  );
}
