import { ProductWithRelations } from "@/app/actions/products";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Product } from "@/types";
import { Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { SafeImage } from "./safe-image";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/use-toast";

interface ProductCardProps {
  product: ProductWithRelations;
  viewMode: "grid" | "list";
  onAddToCart?: (product: ProductWithRelations) => void;
}

export const ProductCard = ({ product, viewMode, onAddToCart }: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;
  const addItem = useCart((s) => s.addItem);


  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({ id: product.id, title: product.name, price: product.price, quantity: 1, image: product.images?.[0], category: product.category, description: product.description ?? "" });
    setIsAdding(true);

    toast({
      title: "Producto agregado a tu pedido",
      description: "",
      duration: 2000,
    });
    
    
    setTimeout(() => setIsAdding(false), 600);
  };

  if (viewMode === "list") {
    return (
      <div className="block group">
        <div className="grid grid-cols-[60px_1fr_150px_100px_auto] items-center gap-4 px-4 py-3 border-b border-border hover:bg-gradient-to-r  hover:to-transparent transition-all cursor-pointer">
          {/* Image */}
          <div className="w-12 h-12 bg-white flex items-center justify-center overflow-hidden border border-border">
            {product.images ? (
              <SafeImage
                src={product.images?.[0]}
                alt={product.name}
                className="object-contain"
                fill
              />
            ) : (
              <Package className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
  
          {/* Name + Category + Description */}
          <div className="flex flex-col">
            <div   className="font-medium text-foreground hover:underline group-hover:text-blue-600 transition-colors">
              {product.name}
            </div>
            {product.category && (
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {product.category}
              </span>
            )}
            {product.description && (
              <span className="text-xs text-muted-foreground line-clamp-1">
                {product.description}
              </span>
            )}
          </div>
  
          {/* Stock + Status
          <div className="flex flex-col text-sm text-muted-foreground">
            <span>Stock: {product.stock}</span>
            {isOutOfStock ? (
              <Badge variant="destructive" className="w-fit text-xs mt-1 rounded-none">
                Out of Stock
              </Badge>
            ) : isLowStock ? (
              <Badge className="w-fit text-xs mt-1 bg-amber-500 text-white rounded-none">
                Low Stock
              </Badge>
            ) : null}
          </div> */}
  
          {/* Price */}
          <div className="text-right">
            <span className="text-lg font-semibold">${product.price.toFixed(2)}</span>
          </div>

          {/* Add to Cart Button
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`
              p-2 border border-border transition-all
              ${isOutOfStock 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-95'
              }
              ${isAdding ? 'animate-ping-once bg-green-500 border-green-500 text-white' : ''}
            `}
          >
            <ShoppingCart className="w-4 h-4" />
          </button> */}
        </div>
      </div>
    );
  }

  return (
    <div >
      <Card className="overflow-hidden hover:shadow-lg transition-all h-full border border-border rounded-none group">
        <div className="relative aspect-square bg-white flex items-center justify-center border-b border-border">
          {product.images ? (
            <SafeImage
              src={product.images?.[0]}
              alt={product.name}
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              fill
            />
          ) : (
            <Package className="w-20 h-20 text-muted-foreground" />
          )}
         
        </div>
        
        <CardContent className="p-4">
          <div className="mb-2">
            {product.category && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {product.category}
              </p>
            )}
            <Link href={`/productos/${product.id}`} className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
              {product.name}
            </Link>
          </div>
          
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {product.description}
            </p>
          )}
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex items-end justify-between gap-3">
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">
              ${product.price.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Stock: {product.stock}
            </p>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`
              px-4 py-2 border border-border transition-all font-medium text-sm
              flex items-center gap-2
              ${isOutOfStock 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-95'
              }
              ${isAdding ? 'scale-95 bg-green-500 border-green-500 text-white' : ''}
            `}
          >
            <ShoppingCart className={`w-4 h-4 ${isAdding ? 'animate-bounce' : ''}`} />
            Add
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};