from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR

# ---------------------------------------------------------
# 設定・定数
# ---------------------------------------------------------
# カラーパレット (Emotional / Advanced / Cool)
BG_COLOR = RGBColor(10, 15, 30)       # Deep Midnight Blue
ACCENT_ORANGE = RGBColor(255, 69, 0)  # Neon Orange Red
ACCENT_CYAN = RGBColor(0, 240, 255)   # Cyber Cyan
ACCENT_GOLD = RGBColor(255, 215, 0)   # Gold
TEXT_WHITE = RGBColor(240, 240, 245)  # Off-white for better readability
TEXT_GRAY = RGBColor(180, 180, 190)   # Sub-text
CARD_BG = RGBColor(30, 35, 50)        # Card background

# レイアウト定数 (Slide Width: 13.333, Height: 7.5)
SLIDE_W = 13.333
SLIDE_H = 7.5
MARGIN = 0.5

# ---------------------------------------------------------
# デザインヘルパー関数
# ---------------------------------------------------------

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    return prs

def add_slide(prs):
    """ベースとなるスライドを作成し、背景色を設定"""
    slide_layout = prs.slide_layouts[6] # 空白レイアウト
    slide = prs.slides.add_slide(slide_layout)
    
    # 背景色設定
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = BG_COLOR
    
    # デザインアクセント：上部のライン
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(SLIDE_W), Inches(0.1))
    line.fill.solid()
    line.fill.fore_color.rgb = ACCENT_ORANGE
    line.line.fill.background() # 線なし
    
    return slide

def add_glass_card(slide, left, top, width, height, transparency=0.1):
    """コンテンツを載せるための半透明カード背景"""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = CARD_BG
    # python-pptxでは透明度の直接設定が難しいため、濃いグレーで代用し、視認性を高める
    # (透明度はxml操作が必要だが、今回は安全のため色で表現)
    shape.line.color.rgb = RGBColor(60, 70, 90)
    shape.line.width = Pt(1)
    shape.shadow.inherit = False # シャドウなしでフラットに
    return shape

def add_title(slide, text, subtext=None):
    """メインタイトルの配置"""
    # メインタイトル
    title_box = slide.shapes.add_textbox(Inches(MARGIN), Inches(0.4), Inches(SLIDE_W - MARGIN*2), Inches(1))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(44)
    p.font.color.rgb = TEXT_WHITE
    p.font.bold = True
    p.font.name = 'Meiryo UI'
    
    # アクセントバー（タイトルの下）
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(MARGIN), Inches(1.3), Inches(1), Inches(0.05))
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT_CYAN
    bar.line.fill.background()

    # サブタイトルあれば
    if subtext:
        sub_box = slide.shapes.add_textbox(Inches(MARGIN + 1.2), Inches(1.15), Inches(8), Inches(0.5))
        tf_s = sub_box.text_frame
        p_s = tf_s.paragraphs[0]
        p_s.text = subtext
        p_s.font.size = Pt(18)
        p_s.font.color.rgb = TEXT_GRAY
        p_s.font.name = 'Meiryo UI'
        p_s.alignment = PP_ALIGN.LEFT

def add_image_placeholder(slide, left, top, width, height, label="IMAGE"):
    """画像プレースホルダー (サイバーパンク風枠)"""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(20, 20, 25) # Darker placeholder
    
    # 枠線
    shape.line.color.rgb = ACCENT_CYAN
    shape.line.width = Pt(1.5)
    # 点線などでテック感を出すには dash_style を使うが、ここではシンプルに色で統一
    
    # テキスト
    tf = shape.text_frame
    tf.text = f"[{label}]"
    tf.paragraphs[0].font.color.rgb = ACCENT_CYAN
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    return shape

def add_kpi_card(slide, label, value, unit, left, top, width, height):
    """KPIを表示するカード"""
    # カード背景
    add_glass_card(slide, left, top, width, height)
    
    # 数値
    val_box = slide.shapes.add_textbox(left, top + Inches(0.2), width, Inches(1.5))
    tf = val_box.text_frame
    p = tf.paragraphs[0]
    p.text = value
    p.font.size = Pt(64)
    p.font.color.rgb = ACCENT_ORANGE
    p.font.bold = True
    p.alignment = PP_ALIGN.CENTER
    
    # 単位
    unit_box = slide.shapes.add_textbox(left, top + Inches(1.3), width, Inches(0.5))
    tf_u = unit_box.text_frame
    p_u = tf_u.paragraphs[0]
    p_u.text = unit
    p_u.font.size = Pt(16)
    p_u.font.color.rgb = TEXT_GRAY
    p_u.alignment = PP_ALIGN.CENTER
    
    # ラベル（タイトル）
    lbl_box = slide.shapes.add_textbox(left, top - Inches(0.2), width, Inches(0.5))
    tf_l = lbl_box.text_frame
    p_l = tf_l.paragraphs[0]
    p_l.text = label
    p_l.font.size = Pt(14)
    p_l.font.color.rgb = TEXT_WHITE
    p_l.alignment = PP_ALIGN.CENTER
    p_l.font.bold = True

def add_list_content(slide, items, left, top, width, height):
    """スタイリッシュなリスト"""
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    for item in items:
        p = tf.add_paragraph()
        p.text = f"▶ {item}"
        p.font.size = Pt(24)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(14)
        p.font.name = 'Meiryo UI'

# ---------------------------------------------------------
# メイン処理
# ---------------------------------------------------------

def main():
    prs = create_presentation()
    
    # --- S1: オープニング ---
    s1 = add_slide(prs)
    # 背景画像エリア（全画面）
    add_image_placeholder(s1, 0, 0, Inches(SLIDE_W), Inches(SLIDE_H), "BG: Glowing Infrastructure Network")
    
    # タイトル（中央・インパクト）
    # 黒い透過座布団を敷いて文字を見やすくする
    overlay = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(2.5), Inches(SLIDE_W), Inches(2.5))
    overlay.fill.solid()
    overlay.fill.fore_color.rgb = BG_COLOR
    overlay.line.fill.background()
    
    title = s1.shapes.add_textbox(Inches(0), Inches(2.6), Inches(SLIDE_W), Inches(1.5))
    tf = title.text_frame
    p = tf.paragraphs[0]
    p.text = "From SUPPORT\nto INFRASTRUCTURE"
    p.font.size = Pt(80)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER
    
    sub = s1.shapes.add_textbox(Inches(0), Inches(4.2), Inches(SLIDE_W), Inches(1))
    tf2 = sub.text_frame
    p2 = tf2.paragraphs[0]
    p2.text = "～サポートから業界インフラへ変革～"
    p2.font.size = Pt(32)
    p2.font.color.rgb = ACCENT_ORANGE
    p2.font.bold = True
    p2.alignment = PP_ALIGN.CENTER

    # --- S2: 組織改編 ---
    s2 = add_slide(prs)
    add_title(s2, "組織改編", "リーテイルサポート部門の新体制")
    
    # 左側：旧体制
    add_glass_card(s2, Inches(1), Inches(2.5), Inches(4.5), Inches(3.5))
    t_old = s2.shapes.add_textbox(Inches(1), Inches(2.6), Inches(4.5), Inches(0.5))
    t_old.text_frame.text = "OLD: 食品流通部門"
    t_old.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    t_old.text_frame.paragraphs[0].font.color.rgb = TEXT_GRAY
    add_image_placeholder(s2, Inches(1.5), Inches(3.2), Inches(3.5), Inches(2.5), "Icon: Mono-color")

    # 矢印
    arrow = s2.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(6), Inches(4), Inches(1.3), Inches(0.8))
    arrow.fill.solid()
    arrow.fill.fore_color.rgb = ACCENT_CYAN
    arrow.line.fill.background()

    # 右側：新体制
    add_glass_card(s2, Inches(7.8), Inches(2.5), Inches(4.5), Inches(3.5))
    # ハイライト枠
    rect = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.8), Inches(2.5), Inches(4.5), Inches(3.5))
    rect.fill.background()
    rect.line.color.rgb = ACCENT_ORANGE
    rect.line.width = Pt(3)
    
    t_new = s2.shapes.add_textbox(Inches(7.8), Inches(2.6), Inches(4.5), Inches(0.5))
    t_new.text_frame.text = "NEW: リーテイルサポート部門"
    t_new.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    t_new.text_frame.paragraphs[0].font.color.rgb = ACCENT_ORANGE
    t_new.text_frame.paragraphs[0].font.bold = True
    add_image_placeholder(s2, Inches(8.3), Inches(3.2), Inches(3.5), Inches(2.5), "Icon: Colorful")

    # --- S3: 2026目標 (KPI) ---
    s3 = add_slide(prs)
    add_title(s3, "2026年度 部門目標", "COMMITMENT")
    
    # 3つのKPIカードを均等配置
    # 全幅13.33, 左右マージン1 -> 残り11.33. 3つで割る -> 約3.7インチずつ
    w_card = 3.5
    gap = 0.5
    start_x = (SLIDE_W - (w_card*3 + gap*2)) / 2
    
    add_kpi_card(s3, "売上高", "1,200", "億円", Inches(start_x), Inches(3), Inches(w_card), Inches(2.5))
    add_kpi_card(s3, "粗利", "23", "億円", Inches(start_x + w_card + gap), Inches(3), Inches(w_card), Inches(2.5))
    add_kpi_card(s3, "営業利益", "8.1", "億円", Inches(start_x + (w_card + gap)*2), Inches(3), Inches(w_card), Inches(2.5))

    # --- S4: 2030ビジョン ---
    s4 = add_slide(prs)
    add_image_placeholder(s4, 0, 0, Inches(SLIDE_W), Inches(SLIDE_H), "BG: Future City 2030")
    # テキスト背景
    overlay4 = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(2), Inches(2), Inches(SLIDE_W-4), Inches(3.5))
    overlay4.fill.solid()
    overlay4.fill.fore_color.rgb = BG_COLOR
    overlay4.line.color.rgb = ACCENT_CYAN
    
    t4 = s4.shapes.add_textbox(Inches(0), Inches(2.5), Inches(SLIDE_W), Inches(1.5))
    p = t4.text_frame.paragraphs[0]
    p.text = "2030 VISION"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(60)
    p.font.color.rgb = TEXT_WHITE
    p.font.bold = True

    t4_sub = s4.shapes.add_textbox(Inches(0), Inches(4), Inches(SLIDE_W), Inches(1))
    p = t4_sub.text_frame.paragraphs[0]
    p.text = "売上高 2,000億円 / 全体4,000億円の半翼へ"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(32)
    p.font.color.rgb = ACCENT_CYAN

    # --- S11: 第1グループ詳細 (左テキスト・右画像レイアウト) ---
    s11 = add_slide(prs)
    add_title(s11, "第1グループ", "主要顧客深耕 × 大型案件")
    
    # 左側：コンテンツエリア (x: 0.5 ~ 6.5)
    add_glass_card(s11, Inches(0.5), Inches(2), Inches(6), Inches(4.5))
    
    # KPIエリア
    kpi_box = s11.shapes.add_textbox(Inches(0.7), Inches(2.2), Inches(5.6), Inches(1))
    p = kpi_box.text_frame.paragraphs[0]
    p.text = "売上目標: 〇〇〇 億円"
    p.font.size = Pt(32)
    p.font.color.rgb = ACCENT_ORANGE
    p.font.bold = True
    
    # リスト
    add_list_content(s11, ["既存顧客シェア100%", "新規大型案件 奪取", "利益率改善 +Xpt"], Inches(0.7), Inches(3.5), Inches(5.6), Inches(3))
    
    # 右側：画像エリア (x: 7.0 ~ 12.8) - 完全に分離し重なりを防ぐ
    add_image_placeholder(s11, Inches(7.0), Inches(2), Inches(5.8), Inches(4.5), "Photo: First Group Action")

    # --- S12: 第2グループ詳細 ---
    s12 = add_slide(prs)
    add_title(s12, "第2グループ", "差別化戦略 × エリア開拓")
    
    # Layout copy of S11
    add_glass_card(s12, Inches(0.5), Inches(2), Inches(6), Inches(4.5))
    kpi_box = s12.shapes.add_textbox(Inches(0.7), Inches(2.2), Inches(5.6), Inches(1))
    p = kpi_box.text_frame.paragraphs[0]
    p.text = "売上目標: 〇〇〇 億円"
    p.font.size = Pt(32)
    p.font.color.rgb = ACCENT_ORANGE
    p.font.bold = True
    add_list_content(s12, ["地方有力チェーン開拓", "メニュー開発支援", "配送効率の極大化"], Inches(0.7), Inches(3.5), Inches(5.6), Inches(3))
    add_image_placeholder(s12, Inches(7.0), Inches(2), Inches(5.8), Inches(4.5), "Photo: Map & Logistics")

    # --- S17: 支援本部施策 (グリッドレイアウト) ---
    s17 = add_slide(prs)
    add_title(s17, "2026 重点施策", "インフラとしての『質』と『量』")
    
    # 3カラムレイアウト
    col_w = 4.0
    gap = 0.3
    start_x = (SLIDE_W - (col_w*3 + gap*2)) / 2
    
    # Col 1: 業務
    add_glass_card(s17, Inches(start_x), Inches(2), Inches(col_w), Inches(4.5))
    t1 = s17.shapes.add_textbox(Inches(start_x), Inches(2.2), Inches(col_w), Inches(0.8))
    t1.text_frame.text = "【業務】"
    t1.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    t1.text_frame.paragraphs[0].font.color.rgb = ACCENT_CYAN
    t1.text_frame.paragraphs[0].font.size = Pt(24)
    add_list_content(s17, ["No more 事務作業", "新CRM導入", "プロセス効率化"], Inches(start_x+0.2), Inches(3), Inches(col_w-0.4), Inches(3))

    # Col 2: 購買
    c2_x = start_x + col_w + gap
    add_glass_card(s17, Inches(c2_x), Inches(2), Inches(col_w), Inches(4.5))
    t2 = s17.shapes.add_textbox(Inches(c2_x), Inches(2.2), Inches(col_w), Inches(0.8))
    t2.text_frame.text = "【購買】"
    t2.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    t2.text_frame.paragraphs[0].font.color.rgb = ACCENT_CYAN
    t2.text_frame.paragraphs[0].font.size = Pt(24)
    add_list_content(s17, ["圧倒的バイイングパワー", "NW 6,000社活用", "原価低減"], Inches(c2_x+0.2), Inches(3), Inches(col_w-0.4), Inches(3))
    
    # Col 3: SCM
    c3_x = c2_x + col_w + gap
    add_glass_card(s17, Inches(c3_x), Inches(2), Inches(col_w), Inches(4.5))
    t3 = s17.shapes.add_textbox(Inches(c3_x), Inches(2.2), Inches(col_w), Inches(0.8))
    t3.text_frame.text = "【SCM】"
    t3.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    t3.text_frame.paragraphs[0].font.color.rgb = ACCENT_CYAN
    t3.text_frame.paragraphs[0].font.size = Pt(24)
    add_list_content(s17, ["欠品ゼロ・遅延ゼロ", "物流効率化", "安定供給"], Inches(c3_x+0.2), Inches(3), Inches(col_w-0.4), Inches(3))

    # --- Finale ---
    s21 = add_slide(prs)
    add_image_placeholder(s21, 0, 0, Inches(SLIDE_W), Inches(SLIDE_H), "BG: New Dawn")
    
    final_text = s21.shapes.add_textbox(Inches(0), Inches(2.5), Inches(SLIDE_W), Inches(2))
    p = final_text.text_frame.paragraphs[0]
    p.text = "さあ、共に未来を創ろう！"
    p.font.size = Pt(64)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER
    
    sub_text = s21.shapes.add_textbox(Inches(0), Inches(4.5), Inches(SLIDE_W), Inches(1))
    p = sub_text.text_frame.paragraphs[0]
    p.text = "私たちの手で業界インフラを築こう！"
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = ACCENT_ORANGE
    p.alignment = PP_ALIGN.CENTER

    # 保存
    output_file = "RS_Kekki_2026_v4.pptx"
    prs.save(output_file)
    print(f"Presentation saved to {output_file}")

if __name__ == "__main__":
    main()
