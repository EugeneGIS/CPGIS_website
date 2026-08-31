import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { getJobPageData } from "@/lib/job-page-data";
import { toShareSafeText } from "@/lib/job-share";

export const alt = "A stylized map marking the location of a CPGIS job";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobPageData(slug);

  if (!job) {
    notFound();
  }

  const title = toShareSafeText(job.title, 92);
  const organization = toShareSafeText(job.organization, 72);
  const location = toShareSafeText(job.location.label, 72);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f7fbff",
          color: "#121a31",
          display: "flex",
          fontFamily: "sans-serif",
          height: "100%",
          padding: "54px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #dbe7ef",
            borderRadius: "34px",
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
            display: "flex",
            height: "100%",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            style={{
              background: "#e9f8fd",
              display: "flex",
              flex: "0 0 43%",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {[18, 36, 54, 72, 90].map((position) => (
              <div
                key={`v-${position}`}
                style={{
                  background: "rgba(47,69,166,0.12)",
                  bottom: 0,
                  display: "flex",
                  left: `${position}%`,
                  position: "absolute",
                  top: 0,
                  width: "2px",
                }}
              />
            ))}
            {[18, 36, 54, 72, 90].map((position) => (
              <div
                key={`h-${position}`}
                style={{
                  background: "rgba(47,69,166,0.12)",
                  display: "flex",
                  height: "2px",
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: `${position}%`,
                }}
              />
            ))}
            <div
              style={{
                background: "rgba(54,183,216,0.16)",
                border: "3px solid rgba(54,183,216,0.42)",
                borderRadius: "50%",
                display: "flex",
                height: "190px",
                left: "25%",
                position: "absolute",
                top: "27%",
                width: "190px",
              }}
            />
            <div
              style={{
                alignItems: "center",
                background: "#3753a1",
                border: "9px solid #ffffff",
                borderRadius: "50% 50% 50% 8px",
                boxShadow: "0 16px 36px rgba(47,69,166,0.35)",
                display: "flex",
                height: "92px",
                justifyContent: "center",
                left: "35%",
                position: "absolute",
                top: "35%",
                transform: "rotate(-45deg)",
                width: "92px",
              }}
            >
              <div
                style={{
                  background: "#36c5f1",
                  borderRadius: "50%",
                  display: "flex",
                  height: "26px",
                  transform: "rotate(45deg)",
                  width: "26px",
                }}
              />
            </div>
            <div
              style={{
                bottom: "34px",
                color: "#3753a1",
                display: "flex",
                fontSize: "22px",
                fontWeight: 700,
                left: "34px",
                maxWidth: "430px",
                position: "absolute",
              }}
            >
              {location}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "54px 58px 50px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#3753a1",
                  display: "flex",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                CPGIS JOBS
              </div>
              <div
                style={{
                  color: "#121a31",
                  display: "flex",
                  fontSize: title.length > 65 ? "41px" : "49px",
                  fontWeight: 700,
                  lineHeight: 1.12,
                  marginTop: "28px",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  color: "#536579",
                  display: "flex",
                  fontSize: "26px",
                  lineHeight: 1.3,
                  marginTop: "24px",
                }}
              >
                {organization}
              </div>
            </div>
            <div
              style={{
                alignItems: "center",
                color: "#536579",
                display: "flex",
                fontSize: "20px",
                justifyContent: "space-between",
              }}
            >
              <span>Explore the opportunity</span>
              <span style={{ color: "#3753a1", fontWeight: 700 }}>
                CPGIS Job Portal
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
