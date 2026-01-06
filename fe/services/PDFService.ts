"use server";

import { revalidatePath } from "next/cache";
import { QueryParams } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function uploadPDF(formData: FormData) {
  try {
    const response = await fetch(`${API_URL}/v1/pdfs`, {
      method: "POST",
      body: formData,
    });

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      const error = await response.text();
      console.error("Error response:", error);
      throw new Error(error || "Failed to upload PDF");
    }

    const result = await response.json();

    revalidatePath("/");
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload PDF"
    };
  }
}

export async function getPDFs(params?: QueryParams) {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);

    const url = `${API_URL}/v1/pdfs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error response:", error);
      throw new Error(error || "Failed to fetch PDFs");
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("Get PDFs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch PDFs",
      data: { data: [], total: 0, page: 1, limit: 10, total_pages: 0 }
    };
  }
}

export async function getPDFById(id: string) {
  try {
    const response = await fetch(`${API_URL}/v1/pdfs/${id}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to fetch PDF");
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("Get PDF by ID error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch PDF"
    };
  }
}

export async function deletePDF(id: string) {
  try {
    const response = await fetch(`${API_URL}/v1/pdfs/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to delete PDF");
    }

    revalidatePath("/");
    return {
      success: true,
      message: "PDF deleted successfully"
    };
  } catch (error) {
    console.error("Delete PDF error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete PDF"
    };
  }
}

export async function summarizePDF(id: string, config: { language: string; output_type: string }) {
  try {
    const response = await fetch(`${API_URL}/v1/pdfs/${id}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to summarize PDF");
    }

    const result = await response.json();

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error("Summarize PDF error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to summarize PDF"
    };
  }
}

export async function viewPDF(id: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/v1/pdfs/${id}/view`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch PDF");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error("View PDF error:", error);
    throw error;
  }
}

export async function getPDFLogs(
  pdfId: string,
  params?: QueryParams
) {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url =
      `${API_URL}/v1/pdfs/${pdfId}/log` +
      (queryParams.toString() ? `?${queryParams.toString()}` : "");

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error response:", error);
      throw new Error(error || "Failed to fetch PDF logs");
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Get PDF logs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch PDF logs",
      data: {
        data: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        total_pages: 0,
      },
    };
  }
}
