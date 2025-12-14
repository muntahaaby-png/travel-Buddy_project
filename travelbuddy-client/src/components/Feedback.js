import { Container, Row, Col, FormGroup } from "reactstrap";
import { useState } from "react";

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [serverMsg, setServerMsg] = useState("");
  const [msgColor, setMsgColor] = useState("#333");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMsg("");

    if (rating === 0 || !comment.trim()) {
      setMsgColor("#a00000");
      setServerMsg("Please choose a rating and write your comment.");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("http://localhost:7500/sendFeedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: localStorage.getItem("userEmail") || "demo@user.com",
          rating,
          comment,
        }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        console.log("SEND FEEDBACK NOT JSON:", raw);
      }

      if (!res.ok) {
        setMsgColor("#a00000");
        setServerMsg(data.serverMsg || data.msg || "Request failed.");
        setLoading(false);
        return;
      }

      setMsgColor("#2e7d32");
      setServerMsg(data.serverMsg || "Thank you for your feedback!");
      setLoading(false);
    } catch (err) {
      console.log("SEND FEEDBACK ERROR:", err);
      setMsgColor("#a00000");
      setServerMsg("Server error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Container
      fluid
      className="p-0 d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh" }}
    >
      <Container style={{ maxWidth: "800px" }}>
        <Row>
          <Col className="text-center">
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: 700,
                color: "#6E2F8A",
                marginBottom: "25px",
              }}
            >
              Give feedback
            </h1>

            <p
              style={{
                fontSize: "1.6rem",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              How would you rate your overall experience?
            </p>

            <FormGroup style={{ marginBottom: "30px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    cursor: "pointer",
                    fontSize: "3rem",
                    margin: "0 6px",
                    color: rating >= star ? "#ffb400" : "#e0e0e0",
                    transition: "transform 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                >
                  ★
                </span>
              ))}
            </FormGroup>

            <p
              style={{
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "15px",
              }}
            >
              Kindly take a moment to tell us what you think
            </p>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <textarea
                  rows="4"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    margin: "0 auto",
                    display: "block",
                    borderRadius: "18px",
                    border: "none",
                    padding: "15px 18px",
                    fontSize: "1rem",
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.12)",
                    resize: "none",
                    backgroundColor: "#ead1e8ff",
                  }}
                />
              </FormGroup>

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: "#4b2c91",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "40px",
                  padding: "12px 40px",
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  marginTop: "25px",
                  marginBottom: "10px",
                  cursor: "pointer",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Sending..." : "Share My Feedback"}
              </button>
            </form>

            {serverMsg && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "0.95rem",
                  color: msgColor,
                  fontWeight: 600,
                }}
              >
                {serverMsg}
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </Container>
  );
}
