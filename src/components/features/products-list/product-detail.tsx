"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Package, ShoppingCart, Minus, Plus } from "lucide-react";
import { Product } from "@/types";
import dogFoodImg from "@/assets/dog-food.jpg";
import catLitterImg from "@/assets/cat-litter.jpg";
import dogToyImg from "@/assets/dog-toy.jpg";
import catFoodImg from "@/assets/cat-food.jpg";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { ProductByIdQuery } from "@/app/actions/products";
import { parse } from "path";



const ProductDetail = ({ product }: { product: ProductByIdQuery | null }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  // Find product by slug - replace with actual API call

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
          <Link href="/products">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;
  const allImages = product.imageUrl ? [product.imageUrl, ...product.images] : product.images;

  const handleAddToCart = () => {
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name}`,
    });
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link href="/productos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>
      </header>

      {/* Product Details */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-square bg-white border border-border flex items-center justify-center">
                {allImages.length > 0 ? (
                  <img
                    src={allImages[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="w-32 h-32 text-muted-foreground" />
                )}
                {/* {isOutOfStock && (
                  <Badge
                    variant="destructive"
                    className="absolute top-4 right-4 text-base px-4 py-2"
                  >
                    Out of Stock
                  </Badge>
                )}
                {isLowStock && !isOutOfStock && (
                  <Badge className="absolute top-4 right-4 text-base px-4 py-2 bg-accent text-accent-foreground">
                    Only {product.stock} left!
                  </Badge>
                )} */}
              </div>
            </Card>

            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {product.category && (
              <Link
                href={`/products?category=${product.category.slug}`}
                className="inline-block"
              >
                <Badge variant="secondary" className="text-sm">
                  {product.category.name}
                </Badge>
              </Link>
            )}

            <div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-4 mb-4">
                <p className="text-4xl font-bold text-primary">
                  ${parseFloat(product.price.toString()).toFixed(2)}
                </p>
                {product.unitQuantity && product.unit && (
                  <p className="text-xl text-muted-foreground">
                    / {product.unitQuantity.toString()} {product.unit}
                  </p>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Stock Status</p>
                    <p className="font-semibold">
                      {isOutOfStock ? (
                        <span className="text-destructive">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="text-accent">Low Stock ({product.stock})</span>
                      ) : (
                        <span className="text-green-600">In Stock ({product.stock})</span>
                      )}
                    </p>
                  </div>
                  {product.estimatedDurationDays && (
                    <div>
                      <p className="text-muted-foreground mb-1">Duration</p>
                      <p className="font-semibold">~{product.estimatedDurationDays} days</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center font-semibold">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock || isOutOfStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
