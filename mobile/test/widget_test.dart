import "package:flutter_test/flutter_test.dart";
import "package:shop/models.dart";

void main() {
  test("formats cents as dollars", () {
    expect(money(49900), "\$499.00");
  });
}
