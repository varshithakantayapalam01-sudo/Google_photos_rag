import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { parseCSV, parseJSON, processIngestion, ParsedRawItem } from "@/lib/pipeline/ingest";

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let rawItems: ParsedRawItem[] = [];
    let provenance = {
      platform: "reddit",
      search_query: "",
      collection_date: new Date().toISOString().split("T")[0],
      collection_method: "csv_import",
      language: "en",
      date_range_start: undefined as string | undefined,
      date_range_end: undefined as string | undefined,
      records_found: undefined as number | undefined,
      notes: undefined as string | undefined,
    };
    let batchId: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      batchId = (formData.get("batch_id") as string) || undefined;

      provenance = {
        platform: (formData.get("platform") as string) || "reddit",
        search_query: (formData.get("search_query") as string) || "",
        collection_date: (formData.get("collection_date") as string) || new Date().toISOString().split("T")[0],
        collection_method: (formData.get("collection_method") as string) || "csv_import",
        language: (formData.get("language") as string) || "en",
        date_range_start: (formData.get("date_range_start") as string) || undefined,
        date_range_end: (formData.get("date_range_end") as string) || undefined,
        records_found: formData.get("records_found") ? Number(formData.get("records_found")) : undefined,
        notes: (formData.get("notes") as string) || undefined,
      };

      if (!file) {
        return NextResponse.json(
          { success: false, error: { code: "MISSING_FILE", message: "File upload is required" } },
          { status: 400 }
        );
      }

      const fileContent = await file.text();
      if (file.name.endsWith(".json")) {
        rawItems = parseJSON(fileContent);
      } else {
        rawItems = parseCSV(fileContent);
      }
    } else {
      // JSON body
      const body = await req.json();
      batchId = body.batch_id;
      if (body.provenance) {
        provenance = { ...provenance, ...body.provenance };
      }

      if (body.csv_content) {
        rawItems = parseCSV(body.csv_content);
      } else if (body.json_content) {
        rawItems = parseJSON(body.json_content);
      } else if (Array.isArray(body.records)) {
        rawItems = body.records;
      }
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_RECORDS", message: "No valid records found to import" } },
        { status: 400 }
      );
    }

    const result = await processIngestion({
      batchId,
      provenance,
      rawItems,
    });

    return NextResponse.json({
      success: true,
      data: {
        batch_id: result.batch.id,
        total_submitted: result.total_submitted,
        records_imported: result.records_imported,
        duplicates_flagged: result.duplicates_flagged,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INGESTION_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
