import { useParams } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";

const products = [
  {
    id: 1,
    name: "2MP IP Camera",
    price: 1999,
    description: "High quality CCTV camera for home and shop security.",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827",
  },
  {
    id: 2,
    name: "1TB Surveillance HDD",
    price: 3499,
    description: "Special hard disk designed for CCTV recording.",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7",
  },
  {
    id: 3,
    name: "Dell Latitude Laptop",
    price: 18000,
    description: "Refurbished business laptop with strong performance.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
  },
];

function ProductDetails() {
  const { id } = useParams();

  const { addToCart } = useContext(CartContext);

  const product = products.find((p) => p.id === Number(id));

  if (!product) {
    return <h2>Product Not Found</h2>;
  }

  return (
    <div className="product-details">
      <img src={product.image} alt={product.name} />

      <div className="product-info">
        <h2>{product.name}</h2>

        <p className="price">₹{product.price}</p>

        <p>{product.description}</p>

        <button onClick={() => addToCart(product)}>Add to Cart</button>
      </div>
    </div>
  );
}

export default ProductDetails;
