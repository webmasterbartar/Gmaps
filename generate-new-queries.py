#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Query Generator for Google Maps Scraper
Generates queries for Elevator and Painting services across all Iranian provinces
"""

# لیست کوئری‌های آسانسور
elevator_queries = [
    "تعمیرکار آسانسور",
    "سرویسکار آسانسور",
    "تعمیر آسانسور",
    "سرویس آسانسور",
    "آسانسور",
    "شرکت آسانسور",
    "نصب آسانسور",
    "بازسازی آسانسور",
    "سرویس ماهانه آسانسور",
    "شرکت آسانسور برای قرارداد"
]

# لیست کوئری‌های نقاشی ساختمان
painting_queries = [
    "نقاش ساختمان",
    "نقاشی ساختمان",
    "نقاش",
    "رنگ کاری ساختمان",
    "رنگ کار",
    "رنگ آمیزی ساختمان",
    "نقاشی منزل",
    "نقاشی واحد",
    "نقاشی خانه",
    "رنگ آمیزی دیوار",
    "رنگ آمیزی سقف",
    "رنگ روغنی",
    "رنگ پلاستیک",
    "پتینه کاری"
]

# استان‌های ایران
iranian_provinces = [
    "تهران",
    "اصفهان",
    "فارس",
    "خراسان رضوی",
    "خوزستان",
    "آذربایجان شرقی",
    "مازندران",
    "کرمان",
    "سیستان و بلوچستان",
    "گیلان",
    "آذربایجان غربی",
    "همدان",
    "کرمانشاه",
    "مرکزی",
    "لرستان",
    "اردبیل",
    "قزوین",
    "یزد",
    "زنجان",
    "قم",
    "گلستان",
    "کردستان",
    "بوشهر",
    "هرمزگان",
    "چهارمحال و بختیاری",
    "ایلام",
    "کهگیلویه و بویراحمد",
    "خراسان شمالی",
    "خراسان جنوبی",
    "سمنان",
    "البرز",
]

def generate_elevator_queries(output_file="queries_elevator.txt"):
    """Generate elevator service queries"""
    
    total_queries = len(elevator_queries) * len(iranian_provinces)
    
    print(f"\n📋 Generating Elevator queries...")
    print(f"  {len(elevator_queries)} query types")
    print(f"  × {len(iranian_provinces)} provinces")
    print(f"  = {total_queries} total queries")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for query in elevator_queries:
            for province in iranian_provinces:
                f.write(f"{query} در {province}\n")
    
    print(f"✓ Saved to: {output_file}\n")
    return total_queries

def generate_painting_queries(output_file="queries_painting.txt"):
    """Generate painting service queries"""
    
    total_queries = len(painting_queries) * len(iranian_provinces)
    
    print(f"📋 Generating Painting queries...")
    print(f"  {len(painting_queries)} query types")
    print(f"  × {len(iranian_provinces)} provinces")
    print(f"  = {total_queries} total queries")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for query in painting_queries:
            for province in iranian_provinces:
                f.write(f"{query} در {province}\n")
    
    print(f"✓ Saved to: {output_file}\n")
    return total_queries

if __name__ == "__main__":
    print("=" * 60)
    print("Google Maps Query Generator - Elevator & Painting Services")
    print("=" * 60)
    
    elevator_count = generate_elevator_queries()
    painting_count = generate_painting_queries()
    
    print("=" * 60)
    print(f"✅ Total queries generated: {elevator_count + painting_count}")
    print(f"   - Elevator: {elevator_count} queries")
    print(f"   - Painting: {painting_count} queries")
    print("=" * 60)

