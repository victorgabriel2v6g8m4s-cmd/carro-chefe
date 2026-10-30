import { useParams } from "../../router";
import { AdminPaymentMethodsPage } from "../admin/AdminPaymentMethodsPage";
import { PaymentChoicePage } from "./PaymentChoicePage";

export function PaymentPage() {
  const { orderId } = useParams();
  return orderId === "configuracoes" ? <AdminPaymentMethodsPage /> : <PaymentChoicePage />;
}
