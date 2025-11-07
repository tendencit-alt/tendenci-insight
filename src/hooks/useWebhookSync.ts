import { useCallback } from "react";

interface WebhookPayload {
  event: string;
  timestamp: string;
  project: {
    id: string;
    name?: string;
    stage?: string;
    deadline?: string | null;
    value?: number;
    [key: string]: any;
  };
  changes?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
}

export function useWebhookSync() {
  const sendWebhook = useCallback(async (payload: WebhookPayload) => {
    const webhookUrl = localStorage.getItem("n8n_webhook_url");
    
    if (!webhookUrl) {
      // Webhook não configurado, apenas ignora silenciosamente
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: "tendenci_crm"
        }),
      });
      
      console.log("Webhook n8n notificado:", payload.event);
    } catch (error) {
      console.error("Erro ao enviar webhook n8n:", error);
      // Falha silenciosa - não bloqueia a operação principal
    }
  }, []);

  const notifyProjectCreated = useCallback((project: any) => {
    sendWebhook({
      event: "project_created",
      timestamp: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        stage: project.stage,
        deadline: project.deadline,
        value: project.value
      }
    });
  }, [sendWebhook]);

  const notifyStageChanged = useCallback((project: any, oldStage: string, newStage: string) => {
    sendWebhook({
      event: "project_stage_changed",
      timestamp: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        stage: newStage
      },
      changes: [{
        field: "stage",
        old_value: oldStage,
        new_value: newStage
      }]
    });
  }, [sendWebhook]);

  const notifyDeadlineChanged = useCallback((project: any, oldDeadline: string | null, newDeadline: string | null) => {
    sendWebhook({
      event: "project_deadline_changed",
      timestamp: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        deadline: newDeadline
      },
      changes: [{
        field: "deadline",
        old_value: oldDeadline,
        new_value: newDeadline
      }]
    });
  }, [sendWebhook]);

  const notifyFileUploaded = useCallback((project: any, fileName: string) => {
    sendWebhook({
      event: "project_file_uploaded",
      timestamp: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        file_name: fileName
      }
    });
  }, [sendWebhook]);

  return {
    notifyProjectCreated,
    notifyStageChanged,
    notifyDeadlineChanged,
    notifyFileUploaded,
    sendWebhook
  };
}
