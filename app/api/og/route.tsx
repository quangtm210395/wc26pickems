import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { ReactNode } from "react";

export const runtime = "edge";

const BG = "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d5e 100%)";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BG,
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(255, 215, 0, 0.06)" }} />
      <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255, 215, 0, 0.04)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <span style={{ fontSize: "48px" }}>👑</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "18px", fontWeight: 600, color: "#fbbf24", letterSpacing: "0.05em", textTransform: "uppercase" }}>Đường Đến Ngai Vàng</span>
          <span style={{ fontSize: "16px", color: "#93c5fd", fontWeight: 400 }}>World Cup 2026</span>
        </div>
      </div>
      {children}
      <div style={{ position: "absolute", bottom: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", color: "#64748b" }}>điểm ảo · chơi cho vui · winningworldcup26</span>
      </div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Biến thể: ảnh share cho NHÓM đua riêng.
  if (searchParams.get("kind") === "league") {
    const lname = searchParams.get("name") ?? "Nhóm đua";
    const count = searchParams.get("count") ?? "0";
    const leader = searchParams.get("leader") ?? "—";
    return new ImageResponse(
      (
        <Frame>
          <span style={{ fontSize: "64px", marginBottom: "8px" }}>🏆</span>
          <div style={{ fontSize: "52px", fontWeight: 800, color: "#ffffff", textAlign: "center", maxWidth: "960px", lineHeight: 1.15, marginBottom: "24px" }}>
            {lname}
          </div>
          <div style={{ fontSize: "26px", color: "#e2e8f0", marginBottom: "6px" }}>
            {count} thành viên đang đua dự đoán
          </div>
          <div style={{ fontSize: "22px", color: "#fbbf24", fontWeight: 600 }}>
            Dẫn đầu: {leader}
          </div>
        </Frame>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Biến thể: ảnh share cho BÀI VIẾT tin tức (nhãn loại + tiêu đề).
  if (searchParams.get("kind") === "post") {
    const title = searchParams.get("title") ?? "Tin World Cup 2026";
    const typeLabel = searchParams.get("type") ?? "Tin tức";
    return new ImageResponse(
      (
        <Frame>
          <div
            style={{
              display: "flex",
              padding: "6px 20px",
              borderRadius: "999px",
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.4)",
              marginBottom: "28px",
            }}
          >
            <span style={{ fontSize: "22px", color: "#fbbf24", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {typeLabel}
            </span>
          </div>
          <div style={{ fontSize: "60px", fontWeight: 800, color: "#ffffff", textAlign: "center", maxWidth: "1000px", lineHeight: 1.18 }}>
            {title.length > 120 ? title.slice(0, 120) + "…" : title}
          </div>
        </Frame>
      ),
      { width: 1200, height: 630 },
    );
  }

  const name = searchParams.get("name") ?? "Người chơi";
  const rank = searchParams.get("rank") ?? "?";
  const points = searchParams.get("points") ?? "0";

  const pointsNum = parseInt(points, 10);
  const pointsFormatted = isNaN(pointsNum)
    ? points
    : pointsNum.toLocaleString("vi-VN");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d5e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255, 215, 0, 0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255, 215, 0, 0.04)",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "48px" }}>👑</span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#fbbf24",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Đường Đến Ngai Vàng
            </span>
            <span
              style={{
                fontSize: "16px",
                color: "#93c5fd",
                fontWeight: "400",
              }}
            >
              World Cup 2026
            </span>
          </div>
        </div>

        {/* Player name */}
        <div
          style={{
            fontSize: "42px",
            fontWeight: "700",
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "900px",
            marginBottom: "32px",
            lineHeight: "1.2",
          }}
        >
          {name}
        </div>

        {/* Rank + Points row */}
        <div
          style={{
            display: "flex",
            gap: "60px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Rank */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "80px",
                fontWeight: "900",
                color: "#fbbf24",
                lineHeight: "1",
                letterSpacing: "-2px",
              }}
            >
              #{rank}
            </span>
            <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "500" }}>
              Hạng
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "2px",
              height: "80px",
              background: "rgba(255,255,255,0.15)",
            }}
          />

          {/* Points */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "80px",
                fontWeight: "900",
                color: "#34d399",
                lineHeight: "1",
                letterSpacing: "-2px",
              }}
            >
              {pointsFormatted}đ
            </span>
            <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "500" }}>
              Điểm
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            điểm ảo · chơi cho vui · winningworldcup26
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
