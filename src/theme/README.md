# WOMIO Merkezi Stil Kullanımı

Tüm modüller için tek merkez:

- `src/theme/tokens.ts`
- `src/theme/moduleStyles.ts`

## Ne nereden yönetilir?

1. Renkler, radius, spacing, tipografi:
   - `src/theme/tokens.ts`
2. Modül bazlı ortak ekran stilleri:
   - `src/theme/moduleStyles.ts`

## Yeni modül eklerken

```ts
import { moduleTheme, moduleStyles } from "@/src/theme/moduleStyles"
```

Önerilen kullanım:

- Marka rengi: `moduleTheme.colors.brand`
- Ekran container: `moduleStyles.page`
- İçerik alanı: `moduleStyles.content`
- Kart: `moduleStyles.card`
- Input: `moduleStyles.input`
- Ana buton: `moduleStyles.buttonPrimary`

Bu sayede tek dosyada yapılan görünüm değişikliği tüm mevcut/yeni modüllere tutarlı şekilde uygulanır.
