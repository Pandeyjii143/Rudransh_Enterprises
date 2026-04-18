import { useContext } from "react";
import { CartContext } from "../context/CartContext";

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-img" />

      <h3>{product.name}</h3>

      <p className="price">₹{product.price}</p>

      <button onClick={() => addToCart(product)}>Add to Cart</button>
    </div>
  );
}

export default ProductCard;
