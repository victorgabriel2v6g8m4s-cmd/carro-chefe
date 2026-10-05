import { useEffect, useRef } from "react";
import type { LilyCheckoutPaymentMethod } from "./payment-choice-api";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, unknown>) => {
      bricks: () => {
        create: (type: string, containerId: string, settings: Record<string, unknown>) => Promise<{
          unmount?: () => Promise<void> | void;
        }>;
      };
    };
  }
}

export type MercadoPagoCardPayload = {
  token: string;
  paymentMethodId: string;
  installments: number;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
};

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-cooklily-mercado-pago="true"]');
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar checkout seguro.")), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.cooklilyMercadoPago = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar checkout seguro.")), { once: true });
    document.head.appendChild(script);
  });
}

export function MercadoPagoCardChoiceBrick(props: {
  method: Extract<LilyCheckoutPaymentMethod, "credit_card" | "debit_card">;
  publicKey: string;
  amountCents: number;
  onSubmit: (payload: MercadoPagoCardPayload) => Promise<void>;
  onError: (message: string) => void;
}) {
  const submitRef = useRef(props.onSubmit);
  const errorRef = useRef(props.onError);
  submitRef.current = props.onSubmit;
  errorRef.current = props.onError;
  const containerId = `cooklily-card-payment-${props.method}`;

  useEffect(() => {
    let disposed = false;
    let controller: { unmount?: () => Promise<void> | void } | null = null;

    void loadMercadoPagoSdk().then(async () => {
      if (disposed || !window.MercadoPago) return;
      const mp = new window.MercadoPago(props.publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      const isDebit = props.method === "debit_card";
      const createdController = await bricks.create("cardPayment", containerId, {
        initialization: { amount: props.amountCents / 100 },
        customization: {
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: isDebit ? 1 : 12,
            types: {
              excluded: isDebit
                ? ["credit_card", "prepaid_card"]
                : ["debit_card", "prepaid_card"]
            }
          }
        },
        callbacks: {
          onReady: () => undefined,
          onSubmit: async (formData: any) => {
            const token = String(formData?.token ?? "");
            const paymentMethodId = String(formData?.payment_method_id ?? "");
            const email = String(formData?.payer?.email ?? "").trim();
            const identificationType = String(formData?.payer?.identification?.type ?? "").trim();
            const identificationNumber = String(formData?.payer?.identification?.number ?? "").replace(/\D/g, "");
            await submitRef.current({
              token,
              paymentMethodId,
              installments: isDebit ? 1 : Number(formData?.installments ?? 1),
              payer: {
                email,
                ...(identificationType && identificationNumber
                  ? { identification: { type: identificationType, number: identificationNumber } }
                  : {})
              }
            });
          },
          onError: () => errorRef.current("Não foi possível carregar ou validar os dados do cartão.")
        }
      });
      if (disposed) {
        if (createdController.unmount) await createdController.unmount();
        return;
      }
      controller = createdController;
    }).catch((cause) => {
      errorRef.current(cause instanceof Error ? cause.message : "Falha ao carregar checkout seguro.");
    });

    return () => {
      disposed = true;
      if (controller?.unmount) void controller.unmount();
    };
  }, [props.publicKey, props.amountCents, props.method, containerId]);

  return <div className="card-brick-shell">
    <div id={containerId} />
    <small>
      {props.method === "debit_card" ? "Débito em uma única parcela. " : "Crédito com parcelamento conforme disponibilidade. "}
      Os dados sensíveis são tokenizados pelo Mercado Pago e não passam pelos servidores CookLily.
    </small>
  </div>;
}
