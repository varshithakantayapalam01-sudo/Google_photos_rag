import { describe, it, expect } from "vitest";
import { parseCSV, parseJSON } from "@/lib/pipeline/ingest";
import { checkDuplicate, deduplicateBatch } from "@/lib/pipeline/dedup";
import { authenticateAdminPassword, verifyAdminToken } from "@/lib/auth/admin";

describe("Phase 2 — Data Ingestion & Deduplication Pipeline", () => {
  describe("CSV Parsing & Sanitization", () => {
    it("should parse standard CSV with commas and quotes", () => {
      const csv = `platform,raw_text,source_url,date_posted,title
reddit,"I cannot find a picture of my dog from last summer. I remember he had a blue bandana.",https://reddit.com/r/googlephotos/1,2023-08-15,"Lost dog photo"
play_store,"Search used to work great, now finding screenshots of receipts is impossible.",https://play.google.com/review/2,2023-09-01,"Broken search"`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(2);
      expect(items[0].platform).toBe("reddit");
      expect(items[0].raw_text).toContain("blue bandana");
      expect(items[0].title).toBe("Lost dog photo");
      expect(items[1].platform).toBe("play_store");
    });

    it("should strip author/username columns from CSV input", () => {
      const csv = `platform,raw_text,author,username,author_name,source_url
reddit,"Can't find my passport photo",user123,john_doe,John,https://reddit.com/123`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(1);
      expect(items[0].raw_text).toBe("Can't find my passport photo");
      expect(items[0].metadata).not.toHaveProperty("author");
      expect(items[0].metadata).not.toHaveProperty("username");
      expect(items[0].metadata).not.toHaveProperty("author_name");
    });

    it("should handle alias column names (text, content, body, url)", () => {
      const csv = `source,content,url
twitter,"Searching for my wedding invitation photo returns nothing",https://x.com/post/1`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(1);
      expect(items[0].platform).toBe("twitter");
      expect(items[0].raw_text).toContain("wedding invitation");
      expect(items[0].source_url).toBe("https://x.com/post/1");
    });
  });

  describe("JSON Parsing & Sanitization", () => {
    it("should parse JSON array and strip author usernames", () => {
      const json = JSON.stringify([
        {
          platform: "reddit",
          raw_text: "Where is the photo of the rental car receipt?",
          author: "traveler_99",
          username: "traveler",
          source_url: "https://reddit.com/post/456",
        },
      ]);

      const items = parseJSON(json);
      expect(items).toHaveLength(1);
      expect(items[0].raw_text).toBe("Where is the photo of the rental car receipt?");
      expect(items[0]).not.toHaveProperty("author");
      expect(items[0]).not.toHaveProperty("username");
    });

    it("should parse wrapped JSON object with records or data array", () => {
      const json = JSON.stringify({
        records: [
          {
            platform: "support_forum",
            body: "Google photos doesn't recognize my cat's green eyes anymore.",
          },
        ],
      });

      const items = parseJSON(json);
      expect(items).toHaveLength(1);
      expect(items[0].raw_text).toContain("green eyes");
    });
  });

  describe("Deduplication Engine", () => {
    const existingPool = [
      {
        id: "rec-001",
        text_hash: "31779fb65c92c3a5b6f3a7d2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
        raw_text: "I cannot find a picture of my dog wearing a red collar from 2021",
      },
    ];

    it("should identify exact duplicate texts via normalized hash", () => {
      const incomingText = "  I cannot find a picture of my dog wearing a red collar from 2021\n";
      // Manually compute hash of normalized text for test consistency
      const testHash = "31779fb65c92c3a5b6f3a7d2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2";
      const customPool = [{ id: "rec-001", text_hash: testHash, raw_text: "I cannot find a picture of my dog wearing a red collar from 2021" }];
      
      const check = checkDuplicate(incomingText, customPool);
      expect(check.is_duplicate).toBe(true);
      expect(check.duplicate_of).toBe("rec-001");
    });

    it("should detect near-duplicate posts with similarity > 0.85", () => {
      const existing = [
        {
          id: "rec-100",
          text_hash: "some-hash-1",
          raw_text: "Google Photos cannot find my concert tickets screenshot from yesterday night",
        },
      ];
      const incoming = "Google Photos cannot find my concert tickets screenshot from yesterday evening";

      const check = checkDuplicate(incoming, existing);
      expect(check.is_duplicate).toBe(true);
      expect(check.duplicate_of).toBe("rec-100");
      expect(check.duplicate_reason).toBe("near_duplicate_similarity");
      expect(check.similarity_score).toBeGreaterThan(0.85);
    });

    it("should allow distinct texts without duplicate flags", () => {
      const existing = [
        {
          id: "rec-200",
          text_hash: "some-hash-2",
          raw_text: "How to backup 4k videos to cloud storage?",
        },
      ];
      const incoming = "Trying to locate my passport photo from 2018 trip to Spain";

      const check = checkDuplicate(incoming, existing);
      expect(check.is_duplicate).toBe(false);
      expect(check.duplicate_of).toBeNull();
    });

    it("should deduplicate batch against database and intra-batch items", () => {
      const dbRecords = [
        {
          id: "db-1",
          text_hash: "hash-db-1",
          raw_text: "Looking for sunset over Golden Gate bridge",
        },
      ];

      const batch = [
        { platform: "reddit", raw_text: "Looking for sunset over Golden Gate bridge" }, // Exact DB dup
        { platform: "reddit", raw_text: "Looking for sunset over Golden Gate bridge at dusk" }, // Near DB dup
        { platform: "reddit", raw_text: "Unique post about finding a receipt for car repair" }, // Unique
        { platform: "reddit", raw_text: "Unique post about finding a receipt for car repair" }, // Intra-batch dup
      ];

      const deduplicated = deduplicateBatch(batch, dbRecords);
      expect(deduplicated).toHaveLength(4);
      expect(deduplicated[0].is_duplicate).toBe(true); // matches db-1
      expect(deduplicated[1].is_duplicate).toBe(true); // near-match db-1
      expect(deduplicated[2].is_duplicate).toBe(false); // unique
      expect(deduplicated[3].is_duplicate).toBe(true); // matches batch item 2
    });
  });

  describe("Admin Authentication", () => {
    it("should generate valid token on correct password and verify it", () => {
      const defaultPassword = process.env.ADMIN_PASSWORD || "admin123";
      const token = authenticateAdminPassword(defaultPassword);
      expect(token).toBeTruthy();

      const session = verifyAdminToken(token);
      expect(session).toBeTruthy();
      expect(session?.role).toBe("admin");
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should reject invalid password or tampered token", () => {
      const badToken = authenticateAdminPassword("wrong-password-999");
      expect(badToken).toBeNull();

      const tampered = "eyJyb2xlIjoiYWRtaW4ifQ.badsignature";
      expect(verifyAdminToken(tampered)).toBeNull();
    });
  });
});
