import { useParams } from "react-router-dom";
import ProductEditor from "./ProductEditor";

const UpdateProduct = () => {
  const { id } = useParams();
  return <ProductEditor key={id} mode="edit" productId={id} />;
};

export default UpdateProduct;
