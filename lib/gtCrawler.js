const CRAWLER = {
    getInfo: (searchItem, geo, index, date, formattedDate) => {
        return {
            geo,
            date,
            index,
            formattedDate,
            title: searchItem.title.query,
            image: searchItem.image?.imageUrl,
            url: searchItem.image?.newsUrl,
            articles: JSON.stringify(searchItem.articles),
        };
    },
    convertToDisplayItem: (items) => {
        return items.map( item => {
            return {
                geo: item.geo,
                date: item.date,
                index: item.index,
                formattedDate: item.formattedDate,
                title: item.title,
                image: item.image,
                url: item.newsUrl,
                articles: JSON.parse(item.articles),
            };
        });
    },
    // trendingSearchesDays to saving object
    toSaveItems: (trendingSearchesDays, geo) => {
        const result = [];
        try {
            trendingSearchesDays[0] && trendingSearchesDays[0].trendingSearches.map( (search, index) => {
                const date = trendingSearchesDays[0].date;
                const formattedDate = trendingSearchesDays[0].formattedDate;
                // console.log(search);
                result.push(CRAWLER.getInfo(search, geo, index, date, formattedDate));
            });
        } catch (err){
            console.log('toSaveItems', err);
        }
        return result;
    }
};
module.exports = CRAWLER;
