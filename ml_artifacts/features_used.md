# Features Used

## Input Features
- `gender`
- `footLengthCm`
- `footWidthCm`
- `category`
- `preferredFit` (derived from width quantiles within each gender+category group)

## Target Label
- `recommendedSizeUK`

## Dataset Source
- Primary training dataset: `C:/Users/User/Desktop/UG/ShoesX/ml/data/footwear_size_dataset.csv`.
- This dataset is derived from footwear size references and category/gender-specific fit mappings.
- The target label comes from the real `target_UK_size` column in the dataset.
