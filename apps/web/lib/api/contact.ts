import { api } from "./index";

export interface ContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactApi = {
  submitContactForm: async (data: ContactData) => {
    const res = await api.post("/contact", data);
    return res.data;
  },

  subscribeNewsletter: async (email: string) => {
    const res = await api.post("/contact/newsletter", { email });
    return res.data;
  },
};
