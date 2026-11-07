import random
from collections.abc import Callable, Sequence
from dataclasses import dataclass

from src.schemas.travel import PlaceRecommendation


@dataclass(frozen=True, slots=True)
class PopularPlace:
    name: str
    latitude: float
    longitude: float


POPULAR_PLACES: tuple[PopularPlace, ...] = (
    PopularPlace("Красная площадь", 55.753544, 37.621211),
    PopularPlace("Третьяковская галерея", 55.741389, 37.620833),
    PopularPlace("Парк Горького", 55.731389, 37.603333),
    PopularPlace("ВДНХ", 55.826389, 37.637778),
    PopularPlace("Большой театр", 55.760278, 37.618611),
    PopularPlace("Эрмитаж", 59.939832, 30.314560),
    PopularPlace("Исаакиевский собор", 59.934043, 30.306091),
    PopularPlace("Петергоф", 59.885278, 29.908611),
    PopularPlace("Казанский Кремль", 55.798889, 49.105278),
    PopularPlace("Улица Баумана", 55.788611, 49.122500),
    PopularPlace("Нижегородский Кремль", 56.328611, 44.002500),
    PopularPlace("Кижи", 62.066900, 35.225300),
    PopularPlace("Листвянка", 51.852500, 104.866667),
    PopularPlace("Эйфелева башня", 48.858370, 2.294481),
    PopularPlace("Колизей", 41.890210, 12.492231),
)

Pick = Callable[[Sequence[PopularPlace]], PopularPlace]


def recommend_nearby(
    latitude: float,
    longitude: float,
    *,
    pick: Pick | None = None,
) -> PlaceRecommendation:
    """Случайное популярное место. latitude/longitude пока не фильтруют список: геопоиск — заглушка."""
    chosen = (pick or random.choice)(POPULAR_PLACES)
    return PlaceRecommendation(name=chosen.name, latitude=chosen.latitude, longitude=chosen.longitude)
