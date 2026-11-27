import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkle, UploadSimple } from "@phosphor-icons/react";
import axios from "../axios";
import AppContext from "../Context/Context";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import Dialog from "../ui/Dialog";
import Skeleton from "../ui/Skeleton";
import ProductImage from "../ui/ProductImage";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { toast } from "../ui/toast";
import { apiError, toImageSrc } from "../lib/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

// Keep in sync with the allowed categories in the backend (ProductDraftNormalizer.CATEGORIES).
const CATEGORIES = ["Laptop", "Headphone", "Mobile", "Electronics", "Toys", "Fashion", "Other"];

const EXAMPLE_PROMPTS = [
  "Wireless noise cancelling headphones with 30 hour battery",
  "Premium gaming laptop with 32GB RAM and 1TB SSD",
  "Kids wooden building blocks set with 100 pieces",
];

const EMPTY = {
  name: "",
  brand: "",
  description: "",
  price: "",
  category: "",
  stockQuantity: "",
  releaseDate: "",
  productAvailable: true,
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// One editor for both screens: <ProductEditor mode="create" /> and <ProductEditor mode="edit" productId={id} />
export default function ProductEditor({ mode, productId }) {
  const isEdit = mode === "edit";
  useDocumentTitle(isEdit ? "Edit product" : "Add product");
  const navigate = useNavigate();
  const { refreshData } = useContext(AppContext);
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const fileInput = useRef(null);

  const [searchParams] = useSearchParams();
  const presetCategory = searchParams.get("category");
  const [product, setProduct] = useState(() => ({
    ...EMPTY,
    category: !isEdit && CATEGORIES.includes(presetCategory) ? presetCategory : "",
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageStatus, setPageStatus] = useState(isEdit ? "loading" : "ready");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [storedPreview, setStoredPreview] = useState("");

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const [generatingProduct, setGeneratingProduct] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Load the existing product when editing.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${baseUrl}/api/product/${productId}`);
        if (cancelled) return;
        setProduct({
          name: data.name || "",
          brand: data.brand || "",
          description: data.description || "",
          price: data.price ?? "",
          category: data.category || "",
          stockQuantity: data.stockQuantity ?? "",
          releaseDate: data.releaseDate ? String(data.releaseDate).slice(0, 10) : "",
          productAvailable: Boolean(data.productAvailable),
        });
        const stored = toImageSrc(data) || "";
        setStoredPreview(stored);
        setImagePreview(stored);
        setPageStatus("ready");
      } catch (error) {
        if (!cancelled) setPageStatus(error.response?.status === 404 ? "missing" : "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, productId, baseUrl]);

  // Free object URLs we created for local previews.
  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview]
  );

  const setField = (name, value) => {
    setProduct((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setField(name, type === "checkbox" ? checked : value);
  };

  const applyImage = (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((current) => ({ ...current, image: undefined }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((current) => ({ ...current, image: "Choose a JPEG or PNG image" }));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((current) => ({ ...current, image: "The image must be 5 MB or smaller" }));
      event.target.value = "";
      return;
    }
    applyImage(file);
  };

  const discardNewImage = () => {
    setImageFile(null);
    setImagePreview(storedPreview);
    if (fileInput.current) fileInput.current.value = "";
  };

  const validate = () => {
    const next = {};
    if (!product.name.trim()) next.name = "Enter a product name";
    if (!product.category) next.category = "Choose a category";
    if (product.price === "" || Number(product.price) < 0) next.price = "Enter a price of 0 or more";
    if (product.stockQuantity === "" || Number(product.stockQuantity) < 0 || !Number.isInteger(Number(product.stockQuantity))) {
      next.stockQuantity = "Enter a whole number of 0 or more";
    }
    if (!product.releaseDate) next.releaseDate = "Choose a release date";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError("");

    const payload = {
      ...(isEdit ? { id: Number(productId) } : {}),
      name: product.name.trim(),
      brand: product.brand.trim(),
      description: product.description.trim(),
      price: Number(product.price),
      category: product.category,
      stockQuantity: Number(product.stockQuantity),
      releaseDate: product.releaseDate,
      productAvailable: product.productAvailable,
    };

    const formData = new FormData();
    formData.append("product", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    // Without a new image the server keeps the one already stored.
    if (imageFile) formData.append("imageFile", imageFile);

    try {
      const response = isEdit
        ? await axios.put(`${baseUrl}/api/product/${productId}`, formData)
        : await axios.post(`${baseUrl}/api/product`, formData);
      await refreshData();
      toast.success(isEdit ? "Changes saved" : "Product added");
      const id = isEdit ? productId : response.data?.id;
      navigate(id ? `/product/${id}` : "/");
    } catch (error) {
      const fields = error.response?.data?.fields;
      if (fields) setErrors(fields);
      setSubmitError(apiError(error, "The product could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  // ---------- AI helpers (backend endpoints are ADMIN only) ----------
  const generateProduct = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Describe the product first");
      return;
    }
    setGeneratingProduct(true);
    setAiError("");
    try {
      const { data } = await axios.post(`${baseUrl}/api/product/generate-product`, null, {
        params: { query: aiPrompt.trim() },
      });
      setProduct({
        name: data.name || "",
        brand: data.brand || "",
        description: data.description || "",
        price: data.price ?? "",
        category: data.category || "",
        stockQuantity: data.stockQuantity ?? "",
        releaseDate: data.releaseDate || "",
        productAvailable: Boolean(data.productAvailable),
      });
      setErrors({});
      setSubmitError("");
      setAiFilled(true);
      setAiOpen(false);
      setAiPrompt("");
    } catch (error) {
      setAiError(apiError(error, "Could not reach the server. Please try again."));
    } finally {
      setGeneratingProduct(false);
    }
  };

  const generateDescription = async () => {
    if (!product.name.trim() || !product.category) {
      toast.warning("Enter a product name and category first");
      return;
    }
    setGeneratingDescription(true);
    try {
      const { data } = await axios.post(`${baseUrl}/api/product/generate-description`, null, {
        params: { name: product.name, category: product.category },
      });
      if (data) {
        setField("description", data);
        toast.success("Description written. Review it before saving");
      }
    } catch (error) {
      toast.error(apiError(error, "The description could not be written. Please try again."));
    } finally {
      setGeneratingDescription(false);
    }
  };

  const generateImage = async () => {
    if (!product.name.trim() || !product.category || !product.description.trim()) {
      toast.warning("Enter a name, category and description first");
      return;
    }
    setGeneratingImage(true);
    try {
      const { data } = await axios.post(`${baseUrl}/api/product/generate-image`, null, {
        params: { name: product.name, category: product.category, description: product.description },
        responseType: "arraybuffer",
      });
      if (data) {
        applyImage(new File([data], "ai-generated-image.jpg", { type: "image/jpeg" }));
        toast.success("Image created. Review it before saving");
      }
    } catch (error) {
      // With responseType arraybuffer an error body arrives as bytes, so decode it first.
      let message = "The image could not be created. Please try again.";
      try {
        const raw = new TextDecoder().decode(error.response?.data);
        message = JSON.parse(raw).message || raw || message;
      } catch {
        /* keep the default message */
      }
      toast.error(message);
    } finally {
      setGeneratingImage(false);
    }
  };

  const backTo = isEdit ? `/product/${productId}` : "/";

  if (pageStatus === "loading") {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-6" aria-busy="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-128 w-full rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (pageStatus !== "ready") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Alert kind="error" title={pageStatus === "missing" ? "This product no longer exists" : "The product could not be loaded"}>
          <Link to="/shop" className="body-5 text-fg underline underline-offset-4">
            Back to the shop
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      <Link
        to={backTo}
        className="button-sm inline-flex items-center gap-2 self-start text-muted transition-colors duration-300 ease-brand hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {isEdit ? "Back to the product" : "Back to the shop"}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="heading-3">{isEdit ? "Edit product" : "Add product"}</h1>
          <p className="body-6 text-muted">
            {isEdit ? "Update the details customers see." : "Fill in the details, or let AI draft them from one sentence."}
          </p>
        </div>
        {!isEdit && (
          <Button variant="secondary" onClick={() => { setAiError(""); setAiOpen(true); }}>
            <Sparkle size={20} aria-hidden="true" />
            Draft with AI
          </Button>
        )}
      </header>

      {aiFilled && (
        <Alert kind="info" title="The form was filled by AI">
          Review every field, especially the price and stock, before saving. Nothing has been saved yet.
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 lg:col-span-2">
          <Field label="Name" htmlFor="name" error={errors.name}>
            <Input id="name" name="name" value={product.name} onChange={handleChange} invalid={Boolean(errors.name)} disabled={saving} />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Brand" htmlFor="brand" error={errors.brand} optional>
              <Input id="brand" name="brand" value={product.brand} onChange={handleChange} invalid={Boolean(errors.brand)} disabled={saving} />
            </Field>
            <Field label="Category" htmlFor="category" error={errors.category}>
              <Select id="category" name="category" value={product.category} onChange={handleChange} invalid={Boolean(errors.category)} disabled={saving}>
                <option value="">Choose a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={errors.description} optional>
            <Textarea
              id="description"
              name="description"
              rows={5}
              value={product.description}
              onChange={handleChange}
              invalid={Boolean(errors.description)}
              disabled={saving}
            />
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={generateDescription}
              disabled={generatingDescription || saving}
            >
              <Sparkle size={16} aria-hidden="true" />
              {generatingDescription ? "Writing" : "Write with AI"}
            </Button>
          </Field>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Price" htmlFor="price" error={errors.price}>
              <div className="relative">
                <span className="body-3 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true">
                  ₹
                </span>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={product.price}
                  onChange={handleChange}
                  invalid={Boolean(errors.price)}
                  disabled={saving}
                  className="pl-8"
                />
              </div>
            </Field>
            <Field label="Stock" htmlFor="stockQuantity" error={errors.stockQuantity}>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={product.stockQuantity}
                onChange={handleChange}
                invalid={Boolean(errors.stockQuantity)}
                disabled={saving}
              />
            </Field>
            <Field label="Release date" htmlFor="releaseDate" error={errors.releaseDate}>
              <Input
                id="releaseDate"
                name="releaseDate"
                type="date"
                value={product.releaseDate}
                onChange={handleChange}
                invalid={Boolean(errors.releaseDate)}
                disabled={saving}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <p className="title-4">Photo</p>
            <ProductImage
              src={imagePreview}
              alt={product.name || "Product photo preview"}
              className="aspect-square w-full rounded-lg border border-line"
              iconSize={48}
            />
            <input
              ref={fileInput}
              id="imageFile"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              className="sr-only"
              disabled={saving}
            />
            <div className="flex flex-wrap gap-2">
              <Button as="label" htmlFor="imageFile" variant="secondary" size="sm">
                <UploadSimple size={16} aria-hidden="true" />
                {imagePreview ? "Replace photo" : "Upload photo"}
              </Button>
              <Button variant="secondary" size="sm" onClick={generateImage} disabled={generatingImage || saving}>
                <Sparkle size={16} aria-hidden="true" />
                {generatingImage ? "Creating" : "Create with AI"}
              </Button>
              {imageFile && (
                <Button variant="ghost" size="sm" onClick={discardNewImage}>
                  Discard new photo
                </Button>
              )}
            </div>
            {errors.image ? (
              <p role="alert" className="caption-1 text-danger">
                {errors.image}
              </p>
            ) : (
              <p className="caption-2 text-subtle">JPEG or PNG, up to 5 MB. Optional.</p>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <label htmlFor="productAvailable" className="flex items-start gap-3">
              <input
                id="productAvailable"
                name="productAvailable"
                type="checkbox"
                checked={product.productAvailable}
                onChange={handleChange}
                disabled={saving}
                className="mt-1 size-5 accent-fg"
              />
              <span className="flex flex-col gap-1">
                <span className="title-4">Available for sale</span>
                <span className="caption-2 text-subtle">Customers can add it to their cart when it is in stock.</span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          {submitError && (
            <Alert kind="error" title="The product was not saved">
              {submitError}
            </Alert>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button as={Link} to={backTo} variant="secondary" size="lg">
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Saving" : isEdit ? "Save changes" : "Add product"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={aiOpen}
        onClose={generatingProduct ? undefined : () => setAiOpen(false)}
        dismissible={!generatingProduct}
        title="Draft a product with AI"
        description="Describe the product in a sentence. The form is filled in for you to review. Nothing is saved until you add the product."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAiOpen(false)} disabled={generatingProduct}>
              Cancel
            </Button>
            <Button onClick={generateProduct} disabled={generatingProduct || !aiPrompt.trim()}>
              <Sparkle size={20} aria-hidden="true" />
              {generatingProduct ? "Drafting" : "Draft product"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Product description" htmlFor="aiPrompt">
            <Textarea
              id="aiPrompt"
              data-autofocus
              rows={4}
              value={aiPrompt}
              onChange={(event) => {
                setAiPrompt(event.target.value);
                setAiError("");
              }}
              maxLength={1000}
              placeholder="For example, a lightweight laptop for students with all day battery"
              disabled={generatingProduct}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="caption-1 text-subtle">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <Button key={example} variant="secondary" size="xs" onClick={() => setAiPrompt(example)} disabled={generatingProduct}>
                  {example}
                </Button>
              ))}
            </div>
          </div>
          {aiError && (
            <Alert kind="error" title="The draft could not be created">
              {aiError}
            </Alert>
          )}
        </div>
      </Dialog>
    </div>
  );
}
