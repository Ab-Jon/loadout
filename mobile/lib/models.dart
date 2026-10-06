class Product {
  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.priceCents,
    required this.imagePath,
    required this.specs,
  });

  final String id;
  final String name;
  final String category;
  final String description;
  final int priceCents;
  final String imagePath;
  final List<String> specs;

  factory Product.fromJson(Map<String, dynamic> json) {
    final rawSpecs = json["specs"];
    return Product(
      id: json["id"] as String,
      name: json["name"] as String,
      category: json["category"] as String,
      description: json["description"] as String,
      priceCents: (json["price_cents"] as num).toInt(),
      imagePath: json["image_path"] as String,
      specs: rawSpecs is List ? rawSpecs.map((item) => item.toString()).toList() : const [],
    );
  }
}

class CartLine {
  const CartLine({required this.product, required this.quantity});

  final Product product;
  final int quantity;
}

class OrderLine {
  const OrderLine({required this.name, required this.quantity, required this.unitPriceCents});

  final String name;
  final int quantity;
  final int unitPriceCents;
}

class ShopOrder {
  const ShopOrder({
    required this.id,
    required this.email,
    required this.status,
    required this.totalCents,
    required this.createdAt,
    required this.items,
  });

  final String id;
  final String email;
  final String status;
  final int totalCents;
  final DateTime createdAt;
  final List<OrderLine> items;
}

String money(int cents) {
  final dollars = cents / 100;
  return "\$${dollars.toStringAsFixed(2)}";
}
