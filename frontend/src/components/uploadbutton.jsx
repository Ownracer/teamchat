// frontend/src/components/UploadButton.jsx

import React, { useRef, useState } from "react";

export default function UploadButton({
  uploadUrl = "http://127.0.0.1:8000/api/upload",
  channelId, // ✅ REQUIRED: active channel id
  className = "",
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const openFileDialog = () => fileRef.current?.click();

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      // ✅ 1️⃣ UPLOAD FILE
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || res.statusText || "Upload failed");
      }

      const data = await res.json();

      // ✅ EXPECTED BACKEND RESPONSE:
      // {
      //   file_url: "/uploads/xxx.jpg",
      //   file_type: "image/jpeg"
      // }

      const fileUrl = data.file_url || data.url; // supports both formats
      const fileType = data.file_type || file.type;

      if (!fileUrl) {
        throw new Error("Upload succeeded but no file URL returned by backend.");
      }

      // ✅ 2️⃣ SEND FILE MESSAGE TO CHAT
      const msgRes = await fetch(
        `http://127.0.0.1:8000/api/v1/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "file",
            file_url: fileUrl,
            file_type: fileType,
            content: null,
          }),
        }
      );

      if (!msgRes.ok) {
        const body = await msgRes.json().catch(() => null);
        console.error("Message send failed:", body);
        alert("File uploaded but message send failed.");
      }

    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <button type="button" onClick={openFileDialog} className={className}>
        📎 {uploading ? "Uploading..." : ""}
      </button>
      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleChange}
        accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.docx"
      />
    </>
  );
}
