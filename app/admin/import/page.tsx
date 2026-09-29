"use client";

import React, { useEffect, useState } from "react";
import { FileUploader } from "@/components/admin/FileUploader";
import { CollectionBatch } from "@/types/database";

export default function AdminImportPage() {
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
      <div>
        <h2 className="text-xl font-bold text-white">Data Ingestion (Stage 1)</h2>
        <p className="mt-1 text-xs text-slate-400">
          Upload publicly available user posts or reviews to populate Layer 1 with complete provenance metadata.
        </p>
      </div>

      <FileUploader batches={batches} onImportSuccess={fetchBatches} />
    </div>
  );
}
