export type TemplateCategory = "utility" | "marketing" | "authentication";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type MetaTemplateComponent = { type: string; [key: string]: JsonValue };

export type TemplateDraft = {
  key: string;
  displayName: string;
  category: TemplateCategory;
  language: string;
  bodyTemplate: string;
  variables: Array<"orderNumber" | "stageLabel">;
  metaTemplateName: string;
  components: MetaTemplateComponent[];
};

export type StoredTemplate = TemplateDraft & {
  id: string;
  metaTemplateName: string | null;
  status: "draft" | "active" | "archived";
  updatedAt: string;
};

export type MetaTemplatePayload = {
  name: string;
  language: string;
  category: Uppercase<TemplateCategory>;
  components: MetaTemplateComponent[];
};
